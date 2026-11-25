const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const { drizzle } = require("drizzle-orm/better-sqlite3");
const { sql } = require("drizzle-orm");
const dir = mkdtempSync(path.join(process.cwd(), "work/sqlite-"));
const file = path.join(dir, "test.db");
let db;
try {
  db = new Database(file);
  assert.equal(db.pragma("journal_mode = WAL", { simple: true }), "wal");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = FULL");
  db.pragma("busy_timeout = 5000");
  db.exec(
    "CREATE TABLE probe(id INTEGER PRIMARY KEY, value TEXT NOT NULL UNIQUE)",
  );
  db.prepare("INSERT INTO probe VALUES (?,?)").run(1, "persisted");
  assert.throws(() =>
    db.transaction(() => {
      db.prepare("INSERT INTO probe VALUES (?,?)").run(2, "rollback");
      throw Error("rollback");
    })(),
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM probe").get().n, 1);
  assert.equal(
    drizzle(db).get(sql`SELECT value FROM probe WHERE id=1`).value,
    "persisted",
  );
  db.close();
  db = new Database(file);
  assert.equal(
    db.prepare("SELECT value FROM probe WHERE id=1").get().value,
    "persisted",
  );
  console.log(
    "PASS: SQLite WAL, transaction rollback, Drizzle query, reopen persistence",
    process.version,
    process.platform,
    process.arch,
  );
} finally {
  if (db?.open) db.close();
  rmSync(dir, { recursive: true, force: true });
}
