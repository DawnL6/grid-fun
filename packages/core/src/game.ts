import type { Board } from "./board";
import { findConflicts, type Position } from "./rules";
export type CellState = "empty" | "excluded" | "target";
export type GameState = Readonly<{
  cells: readonly CellState[];
  errors: number;
  history: readonly (readonly CellState[])[];
}>;
export function newGame(board: Board): GameState {
  return {
    cells: Array(board.size * board.size).fill("empty"),
    errors: 0,
    history: [],
  };
}
export function applyOperation(
  board: Board,
  state: GameState,
  changes: readonly Readonly<{ position: Position; state: CellState }>[],
): GameState {
  if (changes.length === 0) return state;
  const cells = [...state.cells];
  const visited = new Set<number>();
  const addedTargets: number[] = [];
  for (const change of changes) {
    const { row, column } = change.position;
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(column) ||
      row < 0 ||
      column < 0 ||
      row >= board.size ||
      column >= board.size
    )
      throw new Error("invalid position");
    const index = row * board.size + column;
    if (visited.has(index)) continue;
    visited.add(index);
    if (!["empty", "excluded", "target"].includes(change.state))
      throw new Error("invalid cell state");
    if (cells[index] !== "target" && change.state === "target")
      addedTargets.push(index);
    cells[index] = change.state;
  }
  const positions: Position[] = cells.flatMap((value, index) =>
    value === "target"
      ? [{ row: Math.floor(index / board.size), column: index % board.size }]
      : [],
  );
  const conflict = findConflicts(board, positions).some((pair) =>
    addedTargets.some((index) => {
      const p = positions[pair.first];
      const q = positions[pair.second];
      return (
        index === p.row * board.size + p.column ||
        index === q.row * board.size + q.column
      );
    }),
  );
  return {
    cells,
    errors: state.errors + (conflict ? 1 : 0),
    history: [...state.history, state.cells],
  };
}
export function undo(state: GameState): GameState {
  if (state.history.length === 0) return state;
  return {
    cells: state.history[state.history.length - 1],
    errors: state.errors,
    history: state.history.slice(0, -1),
  };
}
export function autoExcluded(
  board: Board,
  state: GameState,
): readonly number[] {
  const targets = state.cells.flatMap((cell, index) =>
    cell === "target"
      ? [{ row: Math.floor(index / board.size), column: index % board.size }]
      : [],
  );
  return board.cells.flatMap((cell) => {
    const index = cell.row * board.size + cell.column;
    if (state.cells[index] !== "empty") return [];
    const excluded = targets.some(
      (target) =>
        target.row === cell.row ||
        target.column === cell.column ||
        board.regions[target.row][target.column] === cell.region ||
        Math.max(
          Math.abs(target.row - cell.row),
          Math.abs(target.column - cell.column),
        ) <= 1,
    );
    return excluded ? [index] : [];
  });
}
