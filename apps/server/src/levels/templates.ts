import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../auth/routes.js";

type TemplateConfig = {
  size: number;
  targetDifficulty: number;
  durationSeconds: number;
  errorLimit: number;
};
type TemplateRow = {
  id: string;
  name: string;
  config_json: string;
  version: number;
  status: string;
  created_at: number;
};
const configSchema = {
  type: "object",
  additionalProperties: false,
  required: ["size", "targetDifficulty", "durationSeconds", "errorLimit"],
  properties: {
    size: { type: "integer", minimum: 4, maximum: 10 },
    targetDifficulty: { type: "integer", minimum: 1, maximum: 5 },
    durationSeconds: { type: "integer", minimum: 1, maximum: 86400 },
    errorLimit: { type: "integer", minimum: 0, maximum: 1000 },
  },
} as const;

export function registerTemplateRoutes(
  app: FastifyInstance,
  database: Database.Database,
) {
  app.post<{ Body: { name: string; config: TemplateConfig } }>(
    "/api/v1/admin/level-templates",
    {
      schema: {
        tags: ["admin-levels"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name", "config"],
          properties: {
            name: {
              type: "string",
              minLength: 1,
              maxLength: 80,
              pattern: "\\S",
            },
            config: configSchema,
          },
        },
        response: {
          201: {
            type: "object",
            additionalProperties: false,
            required: ["id", "version", "status"],
            properties: {
              id: { type: "string" },
              version: { type: "integer" },
              status: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!requireAdmin(request, reply, database)) return reply;
      const name = request.body.name.trim();
      const id = randomUUID();
      try {
        database
          .prepare(
            "INSERT INTO level_templates(id,name,config_json,version,status,created_at) VALUES (?,?,?,1,'draft',?)",
          )
          .run(id, name, JSON.stringify(request.body.config), Date.now());
      } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE"))
          return reply.code(409).send({
            code: "DUPLICATE_TEMPLATE",
            message: "Template name already exists",
            requestId: request.id,
          });
        throw error;
      }
      return reply.code(201).send({ id, version: 1, status: "draft" });
    },
  );

  app.get<{
    Querystring: { page?: number; pageSize?: number; status?: string };
  }>(
    "/api/v1/admin/level-templates",
    {
      schema: {
        tags: ["admin-levels"],
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            page: { type: "integer", minimum: 1, maximum: 100000 },
            pageSize: { type: "integer", minimum: 1, maximum: 100 },
            status: { type: "string", enum: ["draft", "active", "archived"] },
          },
        },
      },
    },
    async (request, reply) => {
      if (!requireAdmin(request, reply, database)) return reply;
      const page = request.query.page ?? 1;
      const pageSize = request.query.pageSize ?? 20;
      const status = request.query.status;
      const where = status ? "WHERE status=?" : "";
      const values = status ? [status] : [];
      const total = (
        database
          .prepare(`SELECT COUNT(*) AS count FROM level_templates ${where}`)
          .get(...values) as { count: number }
      ).count;
      const rows = database
        .prepare(
          `SELECT id,name,config_json,version,status,created_at FROM level_templates ${where} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,
        )
        .all(...values, pageSize, (page - 1) * pageSize) as TemplateRow[];
      return {
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          config: JSON.parse(row.config_json),
          version: row.version,
          status: row.status,
          createdAt: row.created_at,
        })),
        total,
        page,
        pageSize,
      };
    },
  );
}
