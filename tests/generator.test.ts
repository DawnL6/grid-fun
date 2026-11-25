import { describe, expect, it } from "vitest";
import { generateCandidate } from "../packages/core/src/generator";
import { isComplete } from "../packages/core/src/rules";
import type { BoardSize } from "../packages/core/src/board";
describe("structural candidate generator", () => {
  it.each([4, 5, 6, 7, 8, 9, 10] as BoardSize[])(
    "generates valid %i board",
    (size) => {
      const { board, solution } = generateCandidate(size, () => 0.5);
      expect(board.cells).toHaveLength(size * size);
      expect(new Set(board.cells.map((cell) => cell.region)).size).toBe(size);
      expect(isComplete(board, solution)).toBe(true);
    },
  );
  it("rejects invalid randomness and size", () => {
    expect(() => generateCandidate(3 as BoardSize)).toThrow();
    expect(() => generateCandidate(4, () => 1)).toThrow();
  });
});
