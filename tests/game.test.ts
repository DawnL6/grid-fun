import { describe, expect, it } from "vitest";
import { createBoard } from "../packages/core/src/board";
import {
  newGame,
  applyOperation,
  undo,
  autoExcluded,
} from "../packages/core/src/game";
const board = createBoard(
  Array.from({ length: 4 }, (_, r) => Array(4).fill(r)),
);
describe("game operation state", () => {
  it("counts multi-rule placement once and preserves errors on undo", () => {
    let state = newGame(board);
    state = applyOperation(board, state, [
      { position: { row: 0, column: 0 }, state: "target" },
    ]);
    state = applyOperation(board, state, [
      { position: { row: 0, column: 1 }, state: "target" },
    ]);
    expect(state.errors).toBe(1);
    state = undo(state);
    expect(state.errors).toBe(1);
    expect(state.cells[1]).toBe("empty");
  });
  it("groups multiple changes into one undo and ignores repeated cells", () => {
    const initial = newGame(board);
    const changed = applyOperation(board, initial, [
      { position: { row: 1, column: 0 }, state: "excluded" },
      { position: { row: 1, column: 1 }, state: "excluded" },
      { position: { row: 1, column: 0 }, state: "empty" },
    ]);
    expect(changed.history).toHaveLength(1);
    expect(undo(changed).cells).toEqual(initial.cells);
  });
  it("keeps automatic exclusion separate from manual state", () => {
    const state = applyOperation(board, newGame(board), [
      { position: { row: 0, column: 0 }, state: "target" },
    ]);
    expect(autoExcluded(board, state)).toContain(1);
    expect(state.cells[1]).toBe("empty");
  });
});
