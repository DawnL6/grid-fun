import { buildApp } from "./app.js";
import { openDatabase } from "./db/database.js";
buildApp()
  .then((app) => {
    const database = openDatabase(
      process.env.GRIDFUN_DB_PATH || "data/gridfun.db",
    );
    app.addHook("onClose", async () => database.raw.close());
    return app.listen({
      port: Number(process.env.PORT || 3000),
      host: process.env.HOST || "127.0.0.1",
    });
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
