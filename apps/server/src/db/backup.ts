import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  mkdirSync,
  openSync,
  readSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";

export type BackupInfo = Readonly<{
  path: string;
  bytes: number;
  sha256: string;
}>;

function checksum(path: string) {
  const hash = createHash("sha256");
  const file = openSync(path, "r");
  const chunk = Buffer.alloc(1024 * 1024);
  try {
    let length: number;
    while ((length = readSync(file, chunk, 0, chunk.length, null)) > 0)
      hash.update(chunk.subarray(0, length));
    return hash.digest("hex");
  } finally {
    closeSync(file);
  }
}

export function verifyBackup(info: BackupInfo): boolean {
  if (
    statSync(info.path).size !== info.bytes ||
    checksum(info.path) !== info.sha256
  )
    return false;
  const backup = new Database(info.path, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    return backup.pragma("integrity_check", { simple: true }) === "ok";
  } finally {
    backup.close();
  }
}

/** VACUUM INTO creates a consistent snapshot, including data still in WAL. */
export function createConsistentBackup(
  database: Database.Database,
  sourcePath: string,
  backupDir = join(dirname(sourcePath), "backups"),
): BackupInfo {
  mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const path = join(backupDir, `gridfun-${Date.now()}-${randomUUID()}.db`);
  database.prepare("VACUUM INTO ?").run(path);
  chmodSync(path, 0o600);
  const info = { path, bytes: statSync(path).size, sha256: checksum(path) };
  if (!verifyBackup(info))
    throw new Error("database backup verification failed");
  return info;
}
