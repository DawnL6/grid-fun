export type BoardSize = 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type RegionId = number;
export type RegionMatrix = readonly (readonly RegionId[])[];
export type Cell = Readonly<{ row: number; column: number; region: RegionId }>;
export type Board = Readonly<{
  size: BoardSize;
  regions: RegionMatrix;
  cells: readonly Cell[];
}>;

export function createBoard(regions: RegionMatrix): Board {
  const size = regions.length;
  if (!Number.isInteger(size) || size < 4 || size > 10)
    throw new Error("board size must be 4–10");
  const counts = new Map<number, number>();
  const cells: Cell[] = [];
  for (let row = 0; row < size; row++) {
    if (regions[row]?.length !== size)
      throw new Error("region matrix must be square");
    for (let column = 0; column < size; column++) {
      const region = regions[row][column];
      if (!Number.isInteger(region) || region < 0 || region >= size)
        throw new Error("invalid region id");
      counts.set(region, (counts.get(region) ?? 0) + 1);
      cells.push({ row, column, region });
    }
  }
  if (counts.size !== size)
    throw new Error("board must contain exactly N regions");
  for (let region = 0; region < size; region++) {
    const members = cells.filter((cell) => cell.region === region);
    const visited = new Set<string>();
    const queue = [members[0]];
    while (queue.length) {
      const cell = queue.shift()!;
      const key = `${cell.row},${cell.column}`;
      if (visited.has(key)) continue;
      visited.add(key);
      for (const next of members) {
        if (
          Math.abs(next.row - cell.row) +
            Math.abs(next.column - cell.column) ===
          1
        )
          queue.push(next);
      }
    }
    if (visited.size !== members.length)
      throw new Error(`region ${region} is disconnected`);
  }
  return {
    size: size as BoardSize,
    regions: regions.map((row) => [...row]),
    cells,
  };
}
