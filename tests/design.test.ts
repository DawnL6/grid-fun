import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { describe, it, expect } from "vitest";
describe("draft core database constraints", () => {
  it("rejects duplicate rewards, invalid balances and edits to published levels", () => {
    const db = new Database(":memory:");
    try {
      db.exec(readFileSync("docs/design/core-schema.draft.sql", "utf8"));
      db.exec(
        "INSERT INTO users VALUES ('u','player'); INSERT INTO levels VALUES ('l',4,'[]','[]',1,1); INSERT INTO reward_claims VALUES ('r','u','star:l:1','{}');",
      );
      expect(() =>
        db.exec("INSERT INTO reward_claims VALUES ('r2','u','star:l:1','{}')"),
      ).toThrow();
      expect(() =>
        db.exec("INSERT INTO user_assets VALUES ('u',-1,0,0)"),
      ).toThrow();
      expect(() =>
        db.exec("UPDATE levels SET locked=0 WHERE id='l'"),
      ).toThrow();
      expect(() => db.exec("DELETE FROM levels WHERE id='l'")).toThrow();
      expect(() =>
        db.exec("INSERT INTO pending_energy VALUES ('p','u','reward',10,11)"),
      ).toThrow();
      db.exec(
        "INSERT INTO ad_sessions VALUES ('ad','u',0,1800000,1000,86401000)",
      );
      expect(() =>
        db.exec(
          "INSERT INTO ad_sessions VALUES ('bad','u',0,1800000,1800001,88200001)",
        ),
      ).toThrow();
    } finally {
      db.close();
    }
  });
});
