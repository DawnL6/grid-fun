import { buildApp } from "./app.js";
buildApp()
  .then((app) =>
    app.listen({
      port: Number(process.env.PORT || 3000),
      host: process.env.HOST || "127.0.0.1",
    }),
  )
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
