import type Database from "better-sqlite3";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { findAdminSession, loginAdmin, revokeAdminSession } from "./admin.js";

const adminSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "username"],
  properties: { id: { type: "string" }, username: { type: "string" } },
} as const;

export function registerAdminRoutes(
  app: FastifyInstance,
  database: Database.Database,
) {
  const failedLogins = new Map<string, { count: number; until: number }>();
  function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
    const session = findAdminSession(database, token);
    if (!session)
      reply.code(401).send({
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        requestId: request.id,
      });
    return session;
  }

  app.post<{ Body: { username: string; password: string } }>(
    "/api/v1/admin/auth/login",
    {
      schema: {
        tags: ["admin-auth"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["username", "password"],
          properties: {
            username: { type: "string", minLength: 3, maxLength: 32 },
            password: { type: "string", minLength: 1, maxLength: 256 },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["token", "expiresAt", "admin"],
            properties: {
              token: { type: "string" },
              expiresAt: { type: "integer" },
              admin: adminSchema,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const key = `${request.ip}:${request.body.username}`;
      const now = Date.now();
      const previous = failedLogins.get(key);
      if (previous && previous.until > now && previous.count >= 5)
        return reply.code(429).send({
          code: "TOO_MANY_ATTEMPTS",
          message: "Try again later",
          requestId: request.id,
        });
      const result = await loginAdmin(
        database,
        request.body.username,
        request.body.password,
      );
      if (!result) {
        failedLogins.set(key, {
          count: previous && previous.until > now ? previous.count + 1 : 1,
          until: now + 15 * 60 * 1000,
        });
        return reply.code(401).send({
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
          requestId: request.id,
        });
      }
      failedLogins.delete(key);
      return result;
    },
  );

  app.get(
    "/api/v1/admin/auth/me",
    { schema: { tags: ["admin-auth"], response: { 200: adminSchema } } },
    async (request, reply) => {
      const session = authenticate(request, reply);
      if (!session) return reply;
      return session.admin;
    },
  );

  app.post(
    "/api/v1/admin/auth/logout",
    { schema: { tags: ["admin-auth"], response: { 204: { type: "null" } } } },
    async (request, reply) => {
      const session = authenticate(request, reply);
      if (!session) return reply;
      revokeAdminSession(database, session.sessionId);
      return reply.code(204).send();
    },
  );
}
