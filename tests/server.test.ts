import { describe, expect, it } from "vitest";
import { buildApp } from "../apps/server/src/app";

describe("server foundation", () => {
  it("returns health with a request ID and a generated OpenAPI contract", async () => {
    const app = await buildApp();
    try {
      const health = await app.inject({ method: "GET", url: "/api/v1/health" });
      expect(health.statusCode).toBe(200);
      expect(health.json()).toEqual({ status: "ok", service: "grid-fun" });
      expect(health.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
      const contract = await app.inject({
        method: "GET",
        url: "/api/v1/openapi.json",
      });
      expect(contract.statusCode).toBe(200);
      expect(contract.json().paths["/health"].get.responses[200]).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it("rejects invalid queries and returns a consistent error", async () => {
    const app = await buildApp();
    try {
      const invalid = await app.inject({
        method: "GET",
        url: "/api/v1/health?check=database",
      });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toMatchObject({
        code: "VALIDATION_ERROR",
        requestId: invalid.headers["x-request-id"],
      });
      const missing = await app.inject({
        method: "GET",
        url: "/api/v1/missing",
      });
      expect(missing.statusCode).toBe(404);
      expect(missing.json()).toMatchObject({
        code: "NOT_FOUND",
        requestId: missing.headers["x-request-id"],
      });
    } finally {
      await app.close();
    }
  });
});
