import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { createConsistentBackup } from "./backup.js";

const migrations = [
  {
    id: "0001_core",
    sql: `
CREATE TABLE users (
  id TEXT PRIMARY KEY, wechat_openid TEXT UNIQUE, player_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('active','disabled')), created_at INTEGER NOT NULL
);
CREATE TABLE levels (
  id TEXT PRIMARY KEY, size INTEGER NOT NULL CHECK(size BETWEEN 4 AND 10),
  regions_json TEXT NOT NULL CHECK(json_valid(regions_json)),
  solution_json TEXT NOT NULL CHECK(json_valid(solution_json)),
  star_rules_json TEXT NOT NULL CHECK(json_valid(star_rules_json)),
  rule_version INTEGER NOT NULL CHECK(rule_version > 0),
  status TEXT NOT NULL CHECK(status IN ('draft','published','offline')),
  locked INTEGER NOT NULL DEFAULT 0 CHECK(locked IN (0,1)), created_at INTEGER NOT NULL,
  CHECK(status = 'draft' OR locked = 1)
);
CREATE TRIGGER levels_protect_update BEFORE UPDATE ON levels
WHEN OLD.locked = 1 AND (
  NEW.size IS NOT OLD.size OR NEW.regions_json IS NOT OLD.regions_json OR
  NEW.solution_json IS NOT OLD.solution_json OR NEW.star_rules_json IS NOT OLD.star_rules_json OR
  NEW.rule_version IS NOT OLD.rule_version OR NEW.locked <> 1
)
BEGIN SELECT RAISE(ABORT, 'published level immutable'); END;
CREATE TRIGGER levels_protect_delete BEFORE DELETE ON levels
WHEN OLD.locked = 1 BEGIN SELECT RAISE(ABORT, 'published level immutable'); END;
CREATE TABLE game_sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  level_id TEXT NOT NULL REFERENCES levels(id), mode TEXT NOT NULL CHECK(mode IN ('classic','daily','free')),
  rule_version INTEGER NOT NULL CHECK(rule_version > 0),
  state TEXT NOT NULL CHECK(state IN ('active','completed')), started_at INTEGER NOT NULL
);
CREATE INDEX game_sessions_user_started ON game_sessions(user_id, started_at);
CREATE TABLE game_saves (
  session_id TEXT PRIMARY KEY REFERENCES game_sessions(id), version INTEGER NOT NULL CHECK(version > 0),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), updated_at INTEGER NOT NULL
);
CREATE TABLE game_records (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL UNIQUE REFERENCES game_sessions(id),
  user_id TEXT NOT NULL REFERENCES users(id), stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 3),
  duration_seconds INTEGER NOT NULL CHECK(duration_seconds >= 0),
  error_count INTEGER NOT NULL CHECK(error_count >= 0), completed_at INTEGER NOT NULL
);
CREATE INDEX game_records_user_completed ON game_records(user_id, completed_at);
CREATE TABLE user_puzzle_progress (
  user_id TEXT NOT NULL REFERENCES users(id), level_id TEXT NOT NULL REFERENCES levels(id),
  best_stars INTEGER NOT NULL CHECK(best_stars BETWEEN 0 AND 3),
  best_duration_seconds INTEGER CHECK(best_duration_seconds IS NULL OR best_duration_seconds >= 0),
  PRIMARY KEY(user_id, level_id)
);
CREATE TABLE user_assets (
  user_id TEXT PRIMARY KEY REFERENCES users(id), coins INTEGER NOT NULL DEFAULT 0 CHECK(coins >= 0),
  energy INTEGER NOT NULL DEFAULT 0 CHECK(energy >= 0), hints INTEGER NOT NULL DEFAULT 0 CHECK(hints >= 0)
);
CREATE TABLE reward_claims (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), business_key TEXT NOT NULL,
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)), created_at INTEGER NOT NULL,
  UNIQUE(user_id, business_key)
);
CREATE TABLE asset_transactions (
  id TEXT PRIMARY KEY, claim_id TEXT NOT NULL REFERENCES reward_claims(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  asset_type TEXT NOT NULL CHECK(asset_type IN ('coins','energy','hints')),
  delta INTEGER NOT NULL, before_value INTEGER NOT NULL CHECK(before_value >= 0),
  after_value INTEGER NOT NULL CHECK(after_value >= 0 AND after_value = before_value + delta),
  created_at INTEGER NOT NULL
);
CREATE INDEX asset_transactions_user_created ON asset_transactions(user_id, created_at);
`,
  },
  {
    id: "0002_auth_sessions",
    sql: `
CREATE TABLE admin_users (
  id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','disabled')), created_at INTEGER NOT NULL
);
CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admin_users(id),
  token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, revoked_at INTEGER
);
CREATE INDEX admin_sessions_admin_expiry ON admin_sessions(admin_id, expires_at);
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, revoked_at INTEGER
);
CREATE INDEX user_sessions_user_expiry ON user_sessions(user_id, expires_at);
`,
  },
  {
    id: "0003_level_templates",
    sql: `
CREATE TABLE level_templates (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE,
  config_json TEXT NOT NULL CHECK(json_valid(config_json)),
  version INTEGER NOT NULL CHECK(version > 0),
  status TEXT NOT NULL CHECK(status IN ('draft','active','archived')),
  created_at INTEGER NOT NULL
);
CREATE INDEX level_templates_status_created ON level_templates(status, created_at);
`,
  },
  {
    id: "0004_level_template_versions",
    sql: `
CREATE TABLE level_template_versions (
  template_id TEXT NOT NULL REFERENCES level_templates(id),
  version INTEGER NOT NULL CHECK(version > 0),
  name TEXT NOT NULL,
  config_json TEXT NOT NULL CHECK(json_valid(config_json)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(template_id,version)
);
INSERT INTO level_template_versions(template_id,version,name,config_json,created_at)
SELECT id,version,name,config_json,created_at FROM level_templates;
CREATE TRIGGER level_template_versions_no_update BEFORE UPDATE ON level_template_versions
BEGIN SELECT RAISE(ABORT,'template version immutable'); END;
CREATE TRIGGER level_template_versions_no_delete BEFORE DELETE ON level_template_versions
BEGIN SELECT RAISE(ABORT,'template version immutable'); END;
`,
  },
] as const;

export function openDatabase(path: string) {
  const existingFile = path !== ":memory:" && existsSync(path);
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const raw = new Database(path);
  try {
    raw.pragma("journal_mode = WAL");
    raw.pragma("synchronous = FULL");
    raw.pragma("foreign_keys = ON");
    raw.pragma("busy_timeout = 5000");
    const hasMigrationTable = raw
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
      )
      .get();
    const pending = migrations.filter(
      (migration) =>
        !hasMigrationTable ||
        !raw
          .prepare("SELECT 1 FROM schema_migrations WHERE id = ?")
          .get(migration.id),
    );
    const backup =
      existingFile && pending.length > 0
        ? createConsistentBackup(raw, path)
        : null;
    raw.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)",
    );
    const apply = raw.transaction((id: string, sql: string) => {
      raw.exec(sql);
      raw
        .prepare("INSERT INTO schema_migrations(id, applied_at) VALUES (?, ?)")
        .run(id, Date.now());
    });
    for (const migration of pending) apply(migration.id, migration.sql);
    return { raw, orm: drizzle(raw, { schema }), backup };
  } catch (error) {
    raw.close();
    throw error;
  }
}

/** Explicit local development seed. Never run automatically on server startup. */
export function seedDevelopmentSample(raw: Database.Database) {
  if (process.env.NODE_ENV === "production")
    throw new Error("development seed is disabled in production");
  raw
    .prepare(
      `INSERT OR IGNORE INTO levels
    (id,size,regions_json,solution_json,star_rules_json,rule_version,status,locked,created_at)
    VALUES (?,?,?,?,?,1,'draft',0,?)`,
    )
    .run(
      "dev-tutorial-4x4",
      4,
      JSON.stringify([
        [0, 1, 1, 3],
        [0, 1, 3, 3],
        [1, 1, 1, 3],
        [2, 2, 3, 3],
      ]),
      JSON.stringify([
        { row: 0, column: 2 },
        { row: 1, column: 0 },
        { row: 2, column: 3 },
        { row: 3, column: 1 },
      ]),
      JSON.stringify({
        maxStars: 3,
        ruleVersion: 1,
        starRules: [
          { type: "completion", stars: 1 },
          { type: "duration", operator: "lte", value: 120, stars: 1 },
          { type: "errorCount", operator: "lte", value: 2, stars: 1 },
        ],
      }),
      Date.now(),
    );
}
