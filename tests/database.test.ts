import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  openDatabase,
  seedDevelopmentSample,
} from "../apps/server/src/db/database";
import { levels } from "../apps/server/src/db/schema";
import { createBoard } from "../packages/core/src/board";
import { isComplete } from "../packages/core/src/rules";
import { solve } from "../packages/core/src/solver";

describe("SQLite foundation", () => {
  it("migrates once, persists after restart, and keeps WAL and foreign keys", () => {
    const dir = mkdtempSync(join(tmpdir(), "gridfun-db-"));
    const path = join(dir, "game.db");
    try {
      const first = openDatabase(path);
      expect(first.raw.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(first.raw.pragma("synchronous", { simple: true })).toBe(2);
      expect(first.raw.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(first.raw.pragma("busy_timeout", { simple: true })).toBe(5000);
      seedDevelopmentSample(first.raw);
      seedDevelopmentSample(first.raw);
      const sample = first.orm
        .select()
        .from(levels)
        .where(eq(levels.id, "dev-tutorial-4x4"))
        .get();
      expect(sample?.status).toBe("draft");
      const board = createBoard(JSON.parse(sample!.regionsJson));
      const solution = JSON.parse(sample!.solutionJson);
      expect(solve(board)).toMatchObject({ count: 1, exhaustive: true });
      expect(isComplete(board, solution)).toBe(true);
      first.raw.close();
      const reopened = openDatabase(path);
      expect(
        reopened.raw
          .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
          .get(),
      ).toMatchObject({ count: 3 });
      expect(
        reopened.raw.prepare("SELECT COUNT(*) AS count FROM levels").get(),
      ).toMatchObject({ count: 1 });
      reopened.raw.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("enforces immutable published levels, foreign keys and atomic rollback", () => {
    const { raw } = openDatabase(":memory:");
    try {
      seedDevelopmentSample(raw);
      raw
        .prepare(
          "UPDATE levels SET status='published', locked=1 WHERE id='dev-tutorial-4x4'",
        )
        .run();
      expect(() =>
        raw
          .prepare("UPDATE levels SET size=5 WHERE id='dev-tutorial-4x4'")
          .run(),
      ).toThrow(/published level immutable/);
      expect(() =>
        raw.prepare("DELETE FROM levels WHERE id='dev-tutorial-4x4'").run(),
      ).toThrow(/published level immutable/);
      expect(() =>
        raw
          .prepare("INSERT INTO user_assets(user_id) VALUES ('missing')")
          .run(),
      ).toThrow(/FOREIGN KEY/);
      raw
        .prepare(
          "INSERT INTO users(id,player_code,status,created_at) VALUES ('u1','GF1','active',1)",
        )
        .run();
      const claim = raw.transaction(() => {
        raw
          .prepare(
            "INSERT INTO reward_claims(id,user_id,business_key,snapshot_json,created_at) VALUES ('c1','u1','first:1','{}',1)",
          )
          .run();
        raw
          .prepare(
            "INSERT INTO asset_transactions(id,claim_id,user_id,asset_type,delta,before_value,after_value,created_at) VALUES ('t1','c1','u1','coins',5,0,4,1)",
          )
          .run();
      });
      expect(claim).toThrow(/CHECK constraint/);
      expect(
        raw.prepare("SELECT COUNT(*) AS count FROM reward_claims").get(),
      ).toMatchObject({ count: 0 });
    } finally {
      raw.close();
    }
  });

  it("refuses development seed in production", () => {
    const { raw } = openDatabase(":memory:");
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      expect(() => seedDevelopmentSample(raw)).toThrow(
        /disabled in production/,
      );
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
      raw.close();
    }
  });

  it("upgrades a prior core database after a verified backup", () => {
    const dir = mkdtempSync(join(tmpdir(), "gridfun-auth-upgrade-"));
    const path = join(dir, "game.db");
    try {
      const old = openDatabase(path);
      old.raw
        .prepare(
          "INSERT INTO users(id,player_code,status,created_at) VALUES ('u1','GF1','active',1)",
        )
        .run();
      old.raw.exec(
        "DROP TABLE admin_sessions; DROP TABLE user_sessions; DROP TABLE admin_users; DELETE FROM schema_migrations WHERE id='0002_auth_sessions';",
      );
      old.raw.close();
      const upgraded = openDatabase(path);
      try {
        expect(upgraded.backup).not.toBeNull();
        expect(
          upgraded.raw
            .prepare("SELECT player_code FROM users WHERE id='u1'")
            .get(),
        ).toMatchObject({ player_code: "GF1" });
        expect(
          upgraded.raw
            .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
            .get(),
        ).toMatchObject({ count: 3 });
        expect(
          upgraded.raw
            .prepare(
              "SELECT name FROM sqlite_master WHERE name='admin_sessions'",
            )
            .get(),
        ).toBeDefined();
      } finally {
        upgraded.raw.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
