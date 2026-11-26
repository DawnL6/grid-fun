import { describe, expect, it } from "vitest";
import { generateValidated } from "../packages/core/src/quality";
const base = {
  size: 4 as const,
  maxAttempts: 2,
  deadlineMs: 100,
  now: () => 0,
  random: () => 0.5,
};
describe("generation quality gate", () => {
  it("rejects multi-solution candidates and reports duplicates", () => {
    const report = generateValidated(base);
    expect(report.accepted).toHaveLength(0);
    expect(report.attempted).toBe(2);
    expect(report.rejectedMultiple + report.rejectedDuplicate).toBe(2);
  });
  it("honors timeout and cancellation before new work", () => {
    expect(generateValidated({ ...base, now: () => 100 }).stopped).toBe(
      "timeout",
    );
    expect(generateValidated({ ...base, cancelled: () => true }).stopped).toBe(
      "cancelled",
    );
  });
});
