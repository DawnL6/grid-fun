import type { Board } from "./board";
import { solve } from "./solver";
import type { Position } from "./rules";

export type Deduction = Readonly<{
  rule: "single-in-row" | "single-in-column" | "single-in-region";
  unit: number;
  position: Position;
}>;
export type DifficultyReport = Readonly<{
  solutionCount: 0 | 1 | 2;
  deductions: readonly Deduction[];
  solvedBySingles: boolean;
  stalled: boolean;
  level: null;
}>;
/** Uses only direct singles; no guessing. Further techniques and calibrated levels are pending. */
export function analyzeDifficulty(board: Board): DifficultyReport {
  const solutionCount = solve(board).count;
  const placed: Position[] = [];
  const eliminated = new Set<string>();
  const deductions: Deduction[] = [];
  const key = (row: number, column: number) => `${row},${column}`;
  const has = (row: number, column: number) =>
    placed.some((p) => p.row === row && p.column === column);
  const regionAt = (p: Position) => board.regions[p.row][p.column];
  const candidates = () =>
    board.cells.filter(
      (c) => !eliminated.has(key(c.row, c.column)) && !has(c.row, c.column),
    );
  for (let step = 0; step < board.size; step++) {
    let next: Deduction | null = null;
    for (const [rule, unitOf] of [
      ["single-in-row", (p: Position) => p.row],
      ["single-in-column", (p: Position) => p.column],
      ["single-in-region", regionAt],
    ] as const) {
      for (let unit = 0; unit < board.size; unit++) {
        if (placed.some((p) => unitOf(p) === unit)) continue;
        const options = candidates().filter((c) => unitOf(c) === unit);
        if (options.length === 1) {
          next = {
            rule,
            unit,
            position: { row: options[0].row, column: options[0].column },
          };
          break;
        }
      }
      if (next) break;
    }
    if (!next) break;
    deductions.push(next);
    const target = next.position;
    placed.push(target);
    for (const cell of board.cells) {
      if (
        cell.row === target.row ||
        cell.column === target.column ||
        cell.region === regionAt(target) ||
        Math.max(
          Math.abs(cell.row - target.row),
          Math.abs(cell.column - target.column),
        ) <= 1
      )
        eliminated.add(key(cell.row, cell.column));
    }
  }
  const solvedBySingles = solutionCount === 1 && placed.length === board.size;
  return {
    solutionCount,
    deductions,
    solvedBySingles,
    stalled: solutionCount === 1 && !solvedBySingles,
    level: null,
  };
}
