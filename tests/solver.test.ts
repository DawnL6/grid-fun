import { describe, expect, it } from "vitest";
import { createBoard } from "../packages/core/src/board";
import { solve } from "../packages/core/src/solver";
import { isComplete } from "../packages/core/src/rules";
const rowBoard = createBoard(
  Array.from({ length: 4 }, (_, r) => Array(4).fill(r)),
);
describe("solution counter", () => {
  it("stops at two for a multi-solution board", () =>
    expect(solve(rowBoard).count).toBe(2));
  it("reports zero solutions", () => {
    const board = createBoard([
      [0, 0, 0, 0],
      [2, 3, 1, 0],
      [2, 3, 1, 0],
      [2, 3, 1, 0],
    ]);
    expect(solve(board)).toEqual({ count: 0, first: null });
  });
  it("returns the one valid solution", () => {
    const board = createBoard([
      [0, 1, 1, 3],
      [0, 1, 3, 3],
      [1, 1, 1, 3],
      [2, 2, 3, 3],
    ]);
    const result = solve(board);
    expect(result.count).toBe(1);
    expect(isComplete(board, result.first!)).toBe(true);
  });
});
