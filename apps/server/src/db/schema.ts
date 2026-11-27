import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  wechatOpenid: text("wechat_openid").unique(),
  playerCode: text("player_code").notNull().unique(),
  status: text("status", { enum: ["active", "disabled"] }).notNull(),
  createdAt: integer("created_at").notNull(),
});

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  status: text("status", { enum: ["active", "disabled"] }).notNull(),
  createdAt: integer("created_at").notNull(),
});

export const levelTemplates = sqliteTable("level_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  configJson: text("config_json").notNull(),
  version: integer("version").notNull(),
  status: text("status", { enum: ["draft", "active", "archived"] }).notNull(),
  createdAt: integer("created_at").notNull(),
});

export const adminSessions = sqliteTable("admin_sessions", {
  id: text("id").primaryKey(),
  adminId: text("admin_id")
    .notNull()
    .references(() => adminUsers.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  revokedAt: integer("revoked_at"),
});

export const userSessions = sqliteTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  revokedAt: integer("revoked_at"),
});

export const levels = sqliteTable(
  "levels",
  {
    id: text("id").primaryKey(),
    size: integer("size").notNull(),
    regionsJson: text("regions_json").notNull(),
    solutionJson: text("solution_json").notNull(),
    starRulesJson: text("star_rules_json").notNull(),
    ruleVersion: integer("rule_version").notNull(),
    status: text("status", {
      enum: ["draft", "published", "offline"],
    }).notNull(),
    locked: integer("locked", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    check("levels_size", sql`${table.size} BETWEEN 4 AND 10`),
    check("levels_regions_json", sql`json_valid(${table.regionsJson})`),
    check("levels_solution_json", sql`json_valid(${table.solutionJson})`),
    check("levels_rules_json", sql`json_valid(${table.starRulesJson})`),
    check("levels_rule_version", sql`${table.ruleVersion} > 0`),
  ],
);

export const gameSessions = sqliteTable("game_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  levelId: text("level_id")
    .notNull()
    .references(() => levels.id),
  mode: text("mode", { enum: ["classic", "daily", "free"] }).notNull(),
  ruleVersion: integer("rule_version").notNull(),
  state: text("state", { enum: ["active", "completed"] }).notNull(),
  startedAt: integer("started_at").notNull(),
});

export const gameSaves = sqliteTable("game_saves", {
  sessionId: text("session_id")
    .primaryKey()
    .references(() => gameSessions.id),
  version: integer("version").notNull(),
  payloadJson: text("payload_json").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const gameRecords = sqliteTable("game_records", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .unique()
    .references(() => gameSessions.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  stars: integer("stars").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  errorCount: integer("error_count").notNull(),
  completedAt: integer("completed_at").notNull(),
});

export const userPuzzleProgress = sqliteTable(
  "user_puzzle_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    levelId: text("level_id")
      .notNull()
      .references(() => levels.id),
    bestStars: integer("best_stars").notNull(),
    bestDurationSeconds: integer("best_duration_seconds"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.levelId] })],
);

export const userAssets = sqliteTable("user_assets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  coins: integer("coins").notNull().default(0),
  energy: integer("energy").notNull().default(0),
  hints: integer("hints").notNull().default(0),
});

export const rewardClaims = sqliteTable(
  "reward_claims",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    businessKey: text("business_key").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("reward_claim_user_key").on(table.userId, table.businessKey),
  ],
);

export const assetTransactions = sqliteTable("asset_transactions", {
  id: text("id").primaryKey(),
  claimId: text("claim_id")
    .notNull()
    .references(() => rewardClaims.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  assetType: text("asset_type", {
    enum: ["coins", "energy", "hints"],
  }).notNull(),
  delta: integer("delta").notNull(),
  beforeValue: integer("before_value").notNull(),
  afterValue: integer("after_value").notNull(),
  createdAt: integer("created_at").notNull(),
});
