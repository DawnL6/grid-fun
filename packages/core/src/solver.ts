import type { Board } from "./board";
import type { Position } from "./rules";

export type SolveResult = Readonly<{
  count: 0 | 1 | 2;
  first: readonly Position[] | null;
}>;
/** Counts at most two solutions. `count: 2` means two or more. */
export function solve(board: Board): SolveResult {
  const size = board.size;
  const usedColumns = new Set<number>();
  const usedRegions = new Set<number>();
  const placed: Position[] = [];
  let count: 0 | 1 | 2 = 0;
  let first: Position[] | null = null;
  const visit = (row: number): void => {
    if (count === 2) return;
    if (row === size) {
      if (count === 0) first = placed.map((position) => ({ ...position }));
      count = count === 0 ? 1 : 2;
      return;
    }
    for (let column = 0; column < size && count < 2; column++) {
      const region = board.regions[row][column];
      if (usedColumns.has(column) || usedRegions.has(region)) continue;
      if (row > 0 && Math.abs(placed[row - 1].column - column) <= 1) continue;
      placed.push({ row, column });
      usedColumns.add(column);
      usedRegions.add(region);
      visit(row + 1);
      placed.pop();
      usedColumns.delete(column);
      usedRegions.delete(region);
    }
  };
  visit(0);
  return { count, first };
}
