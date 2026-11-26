import { appendFileSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../apps/server/src/db/database";
import { verifyBackup } from "../apps/server/src/db/backup";

describe("migration backup", () => {
  it("takes and verifies a WAL-consistent backup before upgrading an existing file", () => {
    const dir = mkdtempSync(join(tmpdir(), "gridfun-backup-"));
    const path = join(dir, "game.db");
    const old = new Database(path);
    try {
      old.pragma("journal_mode = WAL");
      old.exec("CREATE TABLE legacy_data(value TEXT NOT NULL)");
      old
        .prepare("INSERT INTO legacy_data(value) VALUES (?)")
        .run("saved-user-data");
      const upgraded = openDatabase(path);
      try {
        expect(upgraded.backup).not.toBeNull();
        expect(verifyBackup(upgraded.backup!)).toBe(true);
        expect(statSync(upgraded.backup!.path).mode & 0o777).toBe(0o600);
        const snapshot = new Database(upgraded.backup!.path, {
          readonly: true,
        });
        try {
          expect(
            snapshot.prepare("SELECT value FROM legacy_data").get(),
          ).toMatchObject({ value: "saved-user-data" });
          expect(
            snapshot
              .prepare("SELECT name FROM sqlite_master WHERE name='levels'")
              .get(),
          ).toBeUndefined();
        } finally {
          snapshot.close();
        }
        expect(
          upgraded.raw.prepare("SELECT value FROM legacy_data").get(),
        ).toMatchObject({ value: "saved-user-data" });
        expect(
          upgraded.raw
            .prepare("SELECT name FROM sqlite_master WHERE name='levels'")
            .get(),
        ).toBeDefined();
        appendFileSync(upgraded.backup!.path, "tampered");
        expect(verifyBackup(upgraded.backup!)).toBe(false);
      } finally {
        upgraded.raw.close();
      }
      const reopened = openDatabase(path);
      expect(reopened.backup).toBeNull();
      reopened.raw.close();
    } finally {
      old.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
