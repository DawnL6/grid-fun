import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { createBoard, type RegionMatrix } from "@grid-fun/core/board";
import { solve } from "@grid-fun/core/solver";
import { canonicalRegions } from "@grid-fun/core/canonical";
import { evaluateStars, type StarConfig } from "@grid-fun/core/evaluation";

export type DraftInput = { regions: RegionMatrix; starRules: StarConfig };
export type DraftResult =
  | { ok: true; id: string; size: number }
  | { ok: false; status: 409 | 422; code: string; message: string };

export function createLevelDraft(
  database: Database.Database,
  input: DraftInput,
): DraftResult {
  let board;
  try {
    board = createBoard(input.regions);
    evaluateStars(input.starRules, {
      completed: false,
      durationSeconds: 0,
      errorCount: 0,
    });
  } catch {
    return {
      ok: false,
      status: 422,
      code: "INVALID_LEVEL",
      message: "Invalid board or star rules",
    };
  }
  const search = solve(board, {
    maxNodes: 100000,
    deadlineMs: Date.now() + 2000,
  });
  if (!search.exhaustive)
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_INCOMPLETE",
      message: "Uniqueness could not be verified",
    };
  if (search.count !== 1 || !search.first)
    return {
      ok: false,
      status: 422,
      code: "NOT_UNIQUE",
      message: "Board must have exactly one solution",
    };

  const canonical = canonicalRegions(board.regions);
  return database.transaction((): DraftResult => {
    const existing = database
      .prepare("SELECT regions_json FROM levels")
      .all() as { regions_json: string }[];
    if (
      existing.some(
        (row) => canonicalRegions(JSON.parse(row.regions_json)) === canonical,
      )
    )
      return {
        ok: false,
        status: 409,
        code: "DUPLICATE_LEVEL",
        message: "Equivalent board already exists",
      };
    const id = randomUUID();
    database
      .prepare(
        `INSERT INTO levels
      (id,size,regions_json,solution_json,star_rules_json,rule_version,status,locked,created_at)
      VALUES (?,?,?,?,?,?,'draft',0,?)`,
      )
      .run(
        id,
        board.size,
        JSON.stringify(board.regions),
        JSON.stringify(search.first),
        JSON.stringify(input.starRules),
        input.starRules.ruleVersion,
        Date.now(),
      );
    return { ok: true, id, size: board.size };
  })();
}
