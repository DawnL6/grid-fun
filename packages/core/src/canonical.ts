import type { RegionMatrix } from "./board";

function normalize(matrix: RegionMatrix): string {
  const ids = new Map<number, number>();
  let next = 0;
  return matrix
    .flatMap((row) =>
      row.map((id) => {
        if (!ids.has(id)) ids.set(id, next++);
        return ids.get(id)!;
      }),
    )
    .join(",");
}
function rotate(matrix: RegionMatrix): number[][] {
  const n = matrix.length;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => matrix[n - 1 - c][r]),
  );
}
function mirror(matrix: RegionMatrix): number[][] {
  return matrix.map((row) => [...row].reverse());
}
/** Stable canonical representation under region relabeling and all eight square symmetries. */
export function canonicalRegions(matrix: RegionMatrix): string {
  const n = matrix.length;
  if (n < 4 || n > 10 || matrix.some((row) => row.length !== n))
    throw new Error("invalid matrix");
  const variants: string[] = [];
  for (const source of [matrix, mirror(matrix)]) {
    let current: RegionMatrix = source;
    for (let turn = 0; turn < 4; turn++) {
      variants.push(normalize(current));
      current = rotate(current);
    }
  }
  return `${n}:${variants.sort()[0]}`;
}
