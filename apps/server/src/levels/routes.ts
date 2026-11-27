import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../auth/routes.js";

type LevelSummary = {
  id: string;
  size: number;
  status: string;
  locked: number;
  created_at: number;
};
type LevelDetail = LevelSummary & {
  regions_json: string;
  star_rules_json: string;
  rule_version: number;
};

const summarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "size", "status", "locked", "createdAt"],
  properties: {
    id: { type: "string" },
    size: { type: "integer" },
    status: { type: "string" },
    locked: { type: "boolean" },
    createdAt: { type: "integer" },
  },
} as const;

export function registerLevelRoutes(
  app: FastifyInstance,
  database: Database.Database,
) {
  app.get<{
    Querystring: {
      keyword?: string;
      size?: number;
      status?: string;
      page?: number;
      pageSize?: number;
    };
  }>(
    "/api/v1/admin/levels",
    {
      schema: {
        tags: ["admin-levels"],
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            keyword: { type: "string", maxLength: 64 },
            size: { type: "integer", minimum: 4, maximum: 10 },
            status: { type: "string", enum: ["draft", "published", "offline"] },
            page: { type: "integer", minimum: 1, maximum: 100000 },
            pageSize: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["items", "total", "page", "pageSize"],
            properties: {
              items: { type: "array", items: summarySchema },
              total: { type: "integer" },
              page: { type: "integer" },
              pageSize: { type: "integer" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!requireAdmin(request, reply, database)) return reply;
      const { keyword, size, status } = request.query;
      const page = request.query.page ?? 1;
      const pageSize = request.query.pageSize ?? 20;
      const filters: string[] = [];
      const values: (string | number)[] = [];
      if (keyword) {
        filters.push("instr(id, ?) > 0");
        values.push(keyword);
      }
      if (size !== undefined) {
        filters.push("size = ?");
        values.push(size);
      }
      if (status) {
        filters.push("status = ?");
        values.push(status);
      }
      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const total = (
        database
          .prepare(`SELECT COUNT(*) AS count FROM levels ${where}`)
          .get(...values) as { count: number }
      ).count;
      const rows = database
        .prepare(
          `SELECT id,size,status,locked,created_at FROM levels ${where} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,
        )
        .all(...values, pageSize, (page - 1) * pageSize) as LevelSummary[];
      return {
        items: rows.map((row) => ({
          id: row.id,
          size: row.size,
          status: row.status,
          locked: Boolean(row.locked),
          createdAt: row.created_at,
        })),
        total,
        page,
        pageSize,
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/levels/:id",
    {
      schema: {
        tags: ["admin-levels"],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1, maxLength: 128 } },
        },
        response: {
          200: {
            ...summarySchema,
            required: [
              ...summarySchema.required,
              "regions",
              "starRules",
              "ruleVersion",
            ],
            properties: {
              ...summarySchema.properties,
              regions: {
                type: "array",
                items: { type: "array", items: { type: "integer" } },
              },
              starRules: { type: "object", additionalProperties: true },
              ruleVersion: { type: "integer" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!requireAdmin(request, reply, database)) return reply;
      const row = database
        .prepare(
          "SELECT id,size,status,locked,created_at,regions_json,star_rules_json,rule_version FROM levels WHERE id=?",
        )
        .get(request.params.id) as LevelDetail | undefined;
      if (!row)
        return reply
          .code(404)
          .send({
            code: "NOT_FOUND",
            message: "Level not found",
            requestId: request.id,
          });
      return {
        id: row.id,
        size: row.size,
        status: row.status,
        locked: Boolean(row.locked),
        createdAt: row.created_at,
        regions: JSON.parse(row.regions_json),
        starRules: JSON.parse(row.star_rules_json),
        ruleVersion: row.rule_version,
      };
    },
  );
}
