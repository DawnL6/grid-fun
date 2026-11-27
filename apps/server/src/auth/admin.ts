import { createHash, randomBytes, randomUUID } from "node:crypto";
import argon2 from "argon2";
import type Database from "better-sqlite3";

const SESSION_MS = 12 * 60 * 60 * 1000;

type AdminRow = {
  id: string;
  username: string;
  password_hash: string;
  status: string;
};
type SessionRow = { id: string; admin_id: string; username: string };

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdmin(
  database: Database.Database,
  username: string,
  password: string,
) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]{2,31}$/.test(username))
    throw new Error("invalid admin username");
  if (password.length < 12 || password.length > 256)
    throw new Error("admin password must be 12–256 characters");
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const id = randomUUID();
  database
    .prepare(
      "INSERT INTO admin_users(id,username,password_hash,status,created_at) VALUES (?,?,?,'active',?)",
    )
    .run(id, username, hash, Date.now());
  return { id, username };
}

export async function loginAdmin(
  database: Database.Database,
  username: string,
  password: string,
  now = Date.now(),
) {
  const admin = database
    .prepare(
      "SELECT id,username,password_hash,status FROM admin_users WHERE username=?",
    )
    .get(username) as AdminRow | undefined;
  if (
    !admin ||
    admin.status !== "active" ||
    !(await argon2.verify(admin.password_hash, password))
  )
    return null;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = now + SESSION_MS;
  database
    .prepare(
      "INSERT INTO admin_sessions(id,admin_id,token_hash,expires_at) VALUES (?,?,?,?)",
    )
    .run(randomUUID(), admin.id, tokenHash(token), expiresAt);
  return {
    token,
    expiresAt,
    admin: { id: admin.id, username: admin.username },
  };
}

export function findAdminSession(
  database: Database.Database,
  token: string,
  now = Date.now(),
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = database
    .prepare(
      `SELECT s.id,s.admin_id,a.username FROM admin_sessions s
    JOIN admin_users a ON a.id=s.admin_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.status='active'`,
    )
    .get(tokenHash(token), now) as SessionRow | undefined;
  return session
    ? {
        sessionId: session.id,
        admin: { id: session.admin_id, username: session.username },
      }
    : null;
}

export function revokeAdminSession(
  database: Database.Database,
  sessionId: string,
  now = Date.now(),
) {
  database
    .prepare(
      "UPDATE admin_sessions SET revoked_at=? WHERE id=? AND revoked_at IS NULL",
    )
    .run(now, sessionId);
}
