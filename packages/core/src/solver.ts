import type { Board } from "./board";
import type { Position } from "./rules";
export type SolveResult = Readonly<{
  count: 0 | 1 | 2;
  first: readonly Position[] | null;
  exhaustive: boolean;
  visited: number;
}>;
export type SolveOptions = Readonly<{
  maxNodes?: number;
  cancelled?: () => boolean;
  deadlineMs?: number;
  now?: () => number;
}>;
/** Counts up to two solutions; incomplete searches never prove uniqueness. */
export function solve(board: Board, options: SolveOptions = {}): SolveResult {
  const size = board.size;
  const maxNodes = options.maxNodes ?? Number.POSITIVE_INFINITY;
  if (maxNodes < 1) throw new Error("invalid search budget");
  const usedColumns = new Set<number>(),
    usedRegions = new Set<number>();
  const placed: Position[] = [];
  let count: 0 | 1 | 2 = 0,
    first: Position[] | null = null,
    visited = 0,
    exhaustive = true;
  const visit = (row: number): void => {
    if (count === 2 || !exhaustive) return;
    if (
      options.cancelled?.() ||
      (options.deadlineMs !== undefined &&
        (options.now ?? Date.now)() >= options.deadlineMs) ||
      visited >= maxNodes
    ) {
      exhaustive = false;
      return;
    }
    visited++;
    if (row === size) {
      if (count === 0) first = placed.map((p) => ({ ...p }));
      count = count === 0 ? 1 : 2;
      return;
    }
    for (let column = 0; column < size && count < 2 && exhaustive; column++) {
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
  return {
    count,
    first,
    exhaustive: exhaustive || (count as number) === 2,
    visited,
  };
}
