import { describe, expect, it } from "vitest";
import { createBoard } from "../packages/core/src/board";

describe("board model", () => {
  it.each([4, 5, 6, 7, 8, 9, 10])(
    "accepts %ix%i connected row regions",
    (size) => {
      const board = createBoard(
        Array.from({ length: size }, (_, row) => Array(size).fill(row)),
      );
      expect(board.size).toBe(size);
      expect(board.cells).toHaveLength(size * size);
    },
  );
  it("rejects invalid sizes, shapes, ids, and disconnected regions", () => {
    expect(() =>
      createBoard(Array.from({ length: 3 }, (_, row) => Array(3).fill(row))),
    ).toThrow();
    expect(() => createBoard([[0], [1], [2], [3]])).toThrow();
    expect(() =>
      createBoard(Array.from({ length: 4 }, () => [0, 1, 2, 4])),
    ).toThrow();
    expect(() =>
      createBoard([
        [0, 1, 1, 1],
        [2, 0, 1, 1],
        [2, 2, 3, 3],
        [2, 2, 3, 3],
      ]),
    ).toThrow();
  });
});
