import { openDatabase, seedDevelopmentSample } from "./database.js";

const action = process.argv[2];
if (action !== "migrate" && action !== "seed-dev") {
  console.error("Usage: node dist/db/cli.js migrate|seed-dev");
  process.exit(2);
}
if (action === "seed-dev" && process.env.NODE_ENV === "production") {
  console.error("Development seed is disabled in production");
  process.exit(2);
}
const database = openDatabase(process.env.GRIDFUN_DB_PATH || "data/gridfun.db");
try {
  if (action === "seed-dev") seedDevelopmentSample(database.raw);
  console.log(
    action === "migrate" ? "Migrations applied" : "Development sample seeded",
  );
} finally {
  database.raw.close();
}
