import { buildApp } from "./app.js";
import { openDatabase } from "./db/database.js";
const database = openDatabase(process.env.GRIDFUN_DB_PATH || "data/gridfun.db");
buildApp({ database: database.raw })
  .then((app) => {
    if (database.backup)
      app.log.info(
        { backup: database.backup },
        "pre-migration backup verified",
      );
    app.addHook("onClose", async () => database.raw.close());
    return app.listen({
      port: Number(process.env.PORT || 3000),
      host: process.env.HOST || "127.0.0.1",
    });
  })
  .catch((error: unknown) => {
    if (database.raw.open) database.raw.close();
    console.error(error);
    process.exit(1);
  });
