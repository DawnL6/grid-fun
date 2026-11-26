import { describe, expect, it } from "vitest";
import { createBoard } from "../packages/core/src/board";
import { applyOperation, newGame } from "../packages/core/src/game";
import { getHint } from "../packages/core/src/hint";
const board = createBoard(
  Array.from({ length: 4 }, (_, r) => Array(4).fill(r)),
);
const solution = [
  { row: 0, column: 1 },
  { row: 1, column: 3 },
  { row: 2, column: 0 },
  { row: 3, column: 2 },
];
describe("single-step hints", () => {
  it("reveals only one correct position", () =>
    expect(getHint(board, newGame(board), solution)).toEqual({
      type: "correct-position",
      position: solution[0],
    }));
  it("prioritizes correcting a wrong target", () => {
    const state = applyOperation(board, newGame(board), [
      { position: { row: 0, column: 0 }, state: "target" },
    ]);
    expect(getHint(board, state, solution)).toEqual({
      type: "wrong-target",
      position: { row: 0, column: 0 },
    });
  });
  it("returns no hint on completion", () => {
    const state = applyOperation(
      board,
      newGame(board),
      solution.map((position) => ({ position, state: "target" as const })),
    );
    expect(getHint(board, state, solution)).toBeNull();
  });
});
