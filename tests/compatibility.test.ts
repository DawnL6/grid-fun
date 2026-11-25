import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { describe, it, expect } from "vitest";
describe("SQLite native compatibility", () => {
  it("supports WAL, atomic rollback, Drizzle and persistence", () => {
    mkdirSync("work", { recursive: true });
    const output = execFileSync(process.execPath, ["tests/compatibility.cjs"], {
      encoding: "utf8",
    });
    expect(output).toContain(
      "PASS: SQLite WAL, transaction rollback, Drizzle query, reopen persistence",
    );
  });
});
