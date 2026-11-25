import type { Board } from "./board";
export type Position = Readonly<{ row: number; column: number }>;
export type Conflict = Readonly<{
  first: number;
  second: number;
  rules: readonly ("row" | "column" | "region" | "adjacent")[];
}>;

export function findConflicts(
  board: Board,
  positions: readonly Position[],
): Conflict[] {
  const seen = new Set<string>();
  for (const { row, column } of positions) {
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(column) ||
      row < 0 ||
      column < 0 ||
      row >= board.size ||
      column >= board.size
    )
      throw new Error("invalid position");
    const key = `${row},${column}`;
    if (seen.has(key)) throw new Error("duplicate position");
    seen.add(key);
  }
  const conflicts: Conflict[] = [];
  for (let first = 0; first < positions.length; first++)
    for (let second = first + 1; second < positions.length; second++) {
      const a = positions[first],
        b = positions[second];
      const rules: Conflict["rules"][number][] = [];
      if (a.row === b.row) rules.push("row");
      if (a.column === b.column) rules.push("column");
      if (board.regions[a.row][a.column] === board.regions[b.row][b.column])
        rules.push("region");
      if (Math.max(Math.abs(a.row - b.row), Math.abs(a.column - b.column)) <= 1)
        rules.push("adjacent");
      if (rules.length) conflicts.push({ first, second, rules });
    }
  return conflicts;
}
export function isComplete(
  board: Board,
  positions: readonly Position[],
): boolean {
  return (
    positions.length === board.size &&
    findConflicts(board, positions).length === 0
  );
}
