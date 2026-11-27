import { createAdmin } from "../auth/admin.js";
import { openDatabase, seedDevelopmentSample } from "./database.js";

async function main() {
  const action = process.argv[2];
  if (
    action !== "migrate" &&
    action !== "seed-dev" &&
    action !== "admin-create"
  )
    throw new Error("Usage: node dist/db/cli.js migrate|seed-dev|admin-create");
  if (action === "seed-dev" && process.env.NODE_ENV === "production")
    throw new Error("Development seed is disabled in production");
  const database = openDatabase(
    process.env.GRIDFUN_DB_PATH || "data/gridfun.db",
  );
  try {
    if (database.backup)
      console.log(
        `Pre-migration backup: ${database.backup.path} sha256=${database.backup.sha256}`,
      );
    if (action === "seed-dev") seedDevelopmentSample(database.raw);
    if (action === "admin-create") {
      const username = process.env.GRIDFUN_ADMIN_USERNAME;
      const password = process.env.GRIDFUN_ADMIN_PASSWORD;
      if (!username || !password)
        throw new Error(
          "GRIDFUN_ADMIN_USERNAME and GRIDFUN_ADMIN_PASSWORD are required",
        );
      const admin = await createAdmin(database.raw, username, password);
      console.log(`Administrator created: ${admin.username}`);
    } else {
      console.log(
        action === "migrate"
          ? "Migrations applied"
          : "Development sample seeded",
      );
    }
  } finally {
    database.raw.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Database command failed",
  );
  process.exitCode = 1;
});
