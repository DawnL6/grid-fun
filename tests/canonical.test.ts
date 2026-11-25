import { describe, expect, it } from "vitest";
import { canonicalRegions } from "../packages/core/src/canonical";
const a = [
  [0, 0, 0, 1],
  [0, 1, 1, 1],
  [2, 2, 3, 3],
  [2, 2, 3, 3],
];
const rotate = (m: number[][]) => m.map((_, r) => m.map((_, c) => m[3 - c][r]));
describe("canonical region identity", () => {
  it("ignores region labels", () =>
    expect(
      canonicalRegions(a.map((row) => row.map((id) => [7, 4, 9, 2][id]))),
    ).toBe(canonicalRegions(a)));
  it("ignores rotation and reflection", () => {
    expect(canonicalRegions(rotate(a))).toBe(canonicalRegions(a));
    expect(canonicalRegions(a.map((row) => [...row].reverse()))).toBe(
      canonicalRegions(a),
    );
  });
  it("distinguishes different partitions", () => {
    const rows = Array.from({ length: 4 }, (_, r) => Array(4).fill(r));
    expect(canonicalRegions(rows)).not.toBe(canonicalRegions(a));
  });
});
