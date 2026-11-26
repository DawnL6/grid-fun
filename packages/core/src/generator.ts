import { createBoard, type Board, type BoardSize } from "./board";
import { isComplete, type Position } from "./rules";

export type Candidate = Readonly<{
  board: Board;
  solution: readonly Position[];
}>;

/** Generates a valid structural candidate. Uniqueness and difficulty are checked in later stages. */
export function generateCandidate(
  size: BoardSize,
  random: () => number = Math.random,
): Candidate {
  if (!Number.isInteger(size) || size < 4 || size > 10)
    throw new Error("size must be 4–10");
  const used = new Set<number>();
  const columns: number[] = [];
  const search = (row: number): boolean => {
    if (row === size) return true;
    const options = Array.from({ length: size }, (_, col) => col);
    for (let i = options.length - 1; i > 0; i--) {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1)
        throw new Error("random must return [0,1)");
      const j = Math.floor(value * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    for (const col of options) {
      if (used.has(col) || (row > 0 && Math.abs(columns[row - 1] - col) <= 1))
        continue;
      columns.push(col);
      used.add(col);
      if (search(row + 1)) return true;
      used.delete(col);
      columns.pop();
    }
    return false;
  };
  if (!search(0)) throw new Error("no target layout found");
  const regions = Array.from({ length: size }, () => Array(size).fill(-1));
  const frontier: { row: number; column: number; region: number }[] = [];
  for (let row = 0; row < size; row++) regions[row][columns[row]] = row;
  const neighbors = (row: number, column: number) =>
    [
      [row - 1, column],
      [row + 1, column],
      [row, column - 1],
      [row, column + 1],
    ].filter(([r, c]) => r >= 0 && c >= 0 && r < size && c < size);
  for (let row = 0; row < size; row++)
    for (const [r, c] of neighbors(row, columns[row]))
      frontier.push({ row: r, column: c, region: row });
  while (frontier.length) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1)
      throw new Error("random must return [0,1)");
    const index = Math.floor(value * frontier.length);
    const next = frontier.splice(index, 1)[0];
    if (regions[next.row][next.column] !== -1) continue;
    regions[next.row][next.column] = next.region;
    for (const [r, c] of neighbors(next.row, next.column))
      if (regions[r][c] === -1)
        frontier.push({ row: r, column: c, region: next.region });
  }
  const board = createBoard(regions);
  const solution = columns.map((column, row) => ({ row, column }));
  if (!isComplete(board, solution))
    throw new Error("candidate validation failed");
  return { board, solution };
}
