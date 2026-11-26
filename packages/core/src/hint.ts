import type { Board } from "./board";
import type { GameState } from "./game";
import { isComplete, type Position } from "./rules";
export type Hint = Readonly<
  | { type: "correct-position"; position: Position }
  | { type: "wrong-target"; position: Position }
>;
/** Server-side helper: the solution must never be included in public level payloads. */
export function getHint(
  board: Board,
  state: GameState,
  solution: readonly Position[],
): Hint | null {
  if (!isComplete(board, solution)) throw new Error("invalid solution");
  const answer = new Set(solution.map((p) => `${p.row},${p.column}`));
  if (answer.size !== board.size) throw new Error("invalid solution");
  for (const cell of board.cells) {
    const index = cell.row * board.size + cell.column;
    if (
      state.cells[index] === "target" &&
      !answer.has(`${cell.row},${cell.column}`)
    )
      return {
        type: "wrong-target",
        position: { row: cell.row, column: cell.column },
      };
  }
  for (const position of solution) {
    const index = position.row * board.size + position.column;
    if (state.cells[index] !== "target")
      return { type: "correct-position", position };
  }
  return null;
}
