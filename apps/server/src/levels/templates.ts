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
        database.transaction(() => {
          const now = Date.now();
          const config = JSON.stringify(request.body.config);
          database
            .prepare(
              "INSERT INTO level_templates(id,name,config_json,version,status,created_at) VALUES (?,?,?,1,'draft',?)",
            )
            .run(id, name, config, now);
          database
            .prepare(
              "INSERT INTO level_template_versions(template_id,version,name,config_json,created_at) VALUES (?,1,?,?,?)",
            )
            .run(id, name, config, now);
        })();
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

  app.put<{
    Params: { id: string };
    Body: { name: string; config: TemplateConfig; version: number };
  }>(
    "/api/v1/admin/level-templates/:id",
    {
      schema: {
        tags: ["admin-levels"],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1, maxLength: 128 } },
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name", "config", "version"],
          properties: {
            name: {
              type: "string",
              minLength: 1,
              maxLength: 80,
              pattern: "\\S",
            },
            config: configSchema,
            version: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!requireAdmin(request, reply, database)) return reply;
      const row = database
        .prepare("SELECT version,status FROM level_templates WHERE id=?")
        .get(request.params.id) as
        | { version: number; status: string }
        | undefined;
      if (!row)
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: "Template not found",
          requestId: request.id,
        });
      if (row.status !== "draft" || row.version !== request.body.version)
        return reply.code(409).send({
          code: "VERSION_CONFLICT",
          message: "Template changed or is not editable",
          requestId: request.id,
        });
      const name = request.body.name.trim();
      const config = JSON.stringify(request.body.config);
      try {
        const result = database.transaction(() => {
          const now = Date.now();
          const updated = database
            .prepare(
              "UPDATE level_templates SET name=?,config_json=?,version=version+1 WHERE id=? AND version=? AND status='draft'",
            )
            .run(name, config, request.params.id, request.body.version);
          if (updated.changes !== 1) return false;
          database
            .prepare(
              "INSERT INTO level_template_versions(template_id,version,name,config_json,created_at) VALUES (?,?,?,?,?)",
            )
            .run(
              request.params.id,
              request.body.version + 1,
              name,
              config,
              now,
            );
          return true;
        })();
        if (!result)
          return reply.code(409).send({
            code: "VERSION_CONFLICT",
            message: "Template changed",
            requestId: request.id,
          });
      } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE"))
          return reply.code(409).send({
            code: "DUPLICATE_TEMPLATE",
            message: "Template name already exists",
            requestId: request.id,
          });
        throw error;
      }
      return {
        id: request.params.id,
        version: request.body.version + 1,
        status: "draft",
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/level-templates/:id/versions",
    {
      schema: {
        tags: ["admin-levels"],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1, maxLength: 128 } },
        },
      },
    },
    async (request, reply) => {
      if (!requireAdmin(request, reply, database)) return reply;
      const exists = database
        .prepare("SELECT 1 FROM level_templates WHERE id=?")
        .get(request.params.id);
      if (!exists)
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: "Template not found",
          requestId: request.id,
        });
      const rows = database
        .prepare(
          "SELECT version,name,config_json,created_at FROM level_template_versions WHERE template_id=? ORDER BY version DESC",
        )
        .all(request.params.id) as {
        version: number;
        name: string;
        config_json: string;
        created_at: number;
      }[];
      return {
        items: rows.map((row) => ({
          version: row.version,
          name: row.name,
          config: JSON.parse(row.config_json),
          createdAt: row.created_at,
        })),
      };
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
