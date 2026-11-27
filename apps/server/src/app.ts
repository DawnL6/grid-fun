import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import type { FastifyError } from "fastify";
import swagger from "@fastify/swagger";
import type Database from "better-sqlite3";
import { registerAdminRoutes } from "./auth/routes.js";
import { registerLevelRoutes } from "./levels/routes.js";

const errorSchema = {
  type: "object",
  additionalProperties: false,
  required: ["code", "message", "requestId"],
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    requestId: { type: "string" },
  },
} as const;
const healthSchema = {
  description:
    "Service liveness. This does not prove database or platform readiness.",
  tags: ["system"],
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: { check: { type: "string", enum: ["basic"] } },
  },
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      required: ["status", "service"],
      properties: {
        status: { type: "string", enum: ["ok"] },
        service: { type: "string", enum: ["grid-fun"] },
      },
    },
    400: errorSchema,
  },
} as const;

export async function buildApp(options: { database?: Database.Database } = {}) {
  const app = Fastify({
    logger: {
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.code",
        "req.body.password",
        "req.body.token",
      ],
    },
    genReqId: () => randomUUID(),
  });
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: { title: "GridFun API", version: "0.0.1" },
      servers: [{ url: "/api/v1" }],
    },
  });
  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
  app.setErrorHandler((error, request, reply) => {
    const failure = error as FastifyError & { validation?: unknown };
    const status = failure.validation ? 400 : (failure.statusCode ?? 500);
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    if (safeStatus >= 500) request.log.error(error);
    reply.code(safeStatus).send({
      code: failure.validation
        ? "VALIDATION_ERROR"
        : safeStatus >= 500
          ? "INTERNAL_ERROR"
          : "REQUEST_ERROR",
      message: safeStatus >= 500 ? "Internal server error" : failure.message,
      requestId: request.id,
    });
  });
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      code: "NOT_FOUND",
      message: "Route not found",
      requestId: request.id,
    });
  });
  app.get("/health", { schema: healthSchema }, async () => ({
    status: "ok",
    service: "grid-fun",
  }));
  app.get("/api/v1/health", { schema: healthSchema }, async () => ({
    status: "ok",
    service: "grid-fun",
  }));
  app.get("/api/v1/openapi.json", { schema: { hide: true } }, async () =>
    app.swagger(),
  );
  if (options.database) {
    registerAdminRoutes(app, options.database);
    registerLevelRoutes(app, options.database);
  }
  return app;
}
