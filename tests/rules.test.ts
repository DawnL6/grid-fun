import { describe, expect, it } from "vitest";
import { createBoard } from "../packages/core/src/board";
import { findConflicts, isComplete } from "../packages/core/src/rules";
const board = createBoard(
  Array.from({ length: 4 }, (_, r) => Array(4).fill(r)),
);
describe("four placement rules", () => {
  it("reports row, region, adjacency together", () => {
    expect(
      findConflicts(board, [
        { row: 0, column: 0 },
        { row: 0, column: 1 },
      ])[0].rules,
    ).toEqual(["row", "region", "adjacent"]);
  });
  it("reports column independently", () => {
    expect(
      findConflicts(board, [
        { row: 0, column: 0 },
        { row: 2, column: 0 },
      ])[0].rules,
    ).toEqual(["column"]);
  });
  it("reports diagonal adjacency", () => {
    expect(
      findConflicts(board, [
        { row: 0, column: 0 },
        { row: 1, column: 1 },
      ])[0].rules,
    ).toEqual(["adjacent"]);
  });
  it("requires N nonconflicting placements", () => {
    expect(
      isComplete(board, [
        { row: 0, column: 1 },
        { row: 1, column: 3 },
        { row: 2, column: 0 },
        { row: 3, column: 2 },
      ]),
    ).toBe(true);
    expect(isComplete(board, [{ row: 0, column: 1 }])).toBe(false);
  });
  it("rejects invalid and repeated coordinates", () => {
    expect(() => findConflicts(board, [{ row: 4, column: 0 }])).toThrow();
    expect(() =>
      findConflicts(board, [
        { row: 0, column: 0 },
        { row: 0, column: 0 },
      ]),
    ).toThrow();
  });
});
