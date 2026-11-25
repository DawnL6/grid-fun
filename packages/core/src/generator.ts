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
  const board = createBoard(
    Array.from({ length: size }, (_, row) => Array(size).fill(row)),
  );
  const solution = columns.map((column, row) => ({ row, column }));
  if (!isComplete(board, solution))
    throw new Error("candidate validation failed");
  return { board, solution };
}
