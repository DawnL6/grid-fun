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
    expect(report.accepted).toHaveLength(1);
    expect(report.attempted).toBe(2);
    expect(report.rejectedMultiple + report.rejectedDuplicate).toBe(1);
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

describe("small deterministic batch", () => {
  it("reports actual accepted and rejected counts", () => {
    let seed = 123456789;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const started = Date.now();
    const report = generateValidated({
      size: 4,
      maxAttempts: 100,
      deadlineMs: started + 30000,
      now: Date.now,
      random,
    });
    expect(report.attempted).toBe(100);
    expect(
      report.accepted.length +
        report.rejectedMultiple +
        report.rejectedNoSolution +
        report.rejectedDuplicate,
    ).toBe(100);
    expect(report.accepted.length).toBeGreaterThan(0);
    console.info(
      "S01-11 4x4 batch",
      JSON.stringify({
        attempted: report.attempted,
        accepted: report.accepted.length,
        multiple: report.rejectedMultiple,
        noSolution: report.rejectedNoSolution,
        duplicate: report.rejectedDuplicate,
        elapsedMs: Date.now() - started,
      }),
    );
  });
});

describe("larger deterministic batches", () => {
  it.each([5, 6] as const)("reports %ix%i candidate yield", (size) => {
    let seed = 987654321 + size;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const started = Date.now();
    const report = generateValidated({
      size,
      maxAttempts: 100,
      deadlineMs: started + 30000,
      now: Date.now,
      random,
    });
    expect(report.attempted).toBe(100);
    expect(
      report.accepted.length +
        report.rejectedMultiple +
        report.rejectedNoSolution +
        report.rejectedDuplicate,
    ).toBe(100);
    console.info(
      `S01-11 ${size}x${size} batch`,
      JSON.stringify({
        attempted: 100,
        accepted: report.accepted.length,
        multiple: report.rejectedMultiple,
        noSolution: report.rejectedNoSolution,
        duplicate: report.rejectedDuplicate,
        elapsedMs: Date.now() - started,
      }),
    );
  });
});

describe("large-board smoke batches", () => {
  it.each([7, 8, 9, 10] as const)(
    "reports %ix%i yield without relaxing checks",
    (size) => {
      let seed = 246813579 + size;
      const random = () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const started = Date.now();
      const report = generateValidated({
        size,
        maxAttempts: 20,
        deadlineMs: started + 30000,
        now: Date.now,
        random,
      });
      expect(
        report.accepted.length +
          report.rejectedMultiple +
          report.rejectedNoSolution +
          report.rejectedDuplicate,
      ).toBe(report.attempted);
      console.info(
        `S01-11 ${size}x${size} batch`,
        JSON.stringify({
          attempted: report.attempted,
          accepted: report.accepted.length,
          multiple: report.rejectedMultiple,
          noSolution: report.rejectedNoSolution,
          duplicate: report.rejectedDuplicate,
          stopped: report.stopped,
          elapsedMs: Date.now() - started,
        }),
      );
    },
  );
});
