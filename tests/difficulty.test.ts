import { describe, expect, it } from "vitest";
import { createBoard } from "../packages/core/src/board";
import { analyzeDifficulty } from "../packages/core/src/difficulty";
describe("deterministic singles report", () => {
  it("does not rate multi-solution boards", () => {
    const board = createBoard(
      Array.from({ length: 4 }, (_, r) => Array(4).fill(r)),
    );
    const report = analyzeDifficulty(board);
    expect(report.solutionCount).toBe(2);
    expect(report.level).toBeNull();
  });
  it("records deductions or explicitly reports a stall", () => {
    const board = createBoard([
      [0, 1, 1, 3],
      [0, 1, 3, 3],
      [1, 1, 1, 3],
      [2, 2, 3, 3],
    ]);
    const report = analyzeDifficulty(board);
    expect(report.solutionCount).toBe(1);
    expect(report.solvedBySingles || report.stalled).toBe(true);
    expect(report.level).toBeNull();
  });
});
