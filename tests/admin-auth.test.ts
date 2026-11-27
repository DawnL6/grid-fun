import { describe, expect, it } from "vitest";
import { buildApp } from "../apps/server/src/app";
import { createAdmin, findAdminSession } from "../apps/server/src/auth/admin";
import { openDatabase } from "../apps/server/src/db/database";

describe("administrator authentication", () => {
  it("requires a strong password, isolates the admin token, expires and revokes sessions", async () => {
    const { raw } = openDatabase(":memory:");
    const app = await buildApp({ database: raw });
    try {
      await expect(createAdmin(raw, "owner", "short")).rejects.toThrow(/12/);
      expect(
        raw.prepare("SELECT COUNT(*) AS count FROM admin_users").get(),
      ).toMatchObject({ count: 0 });
      const admin = await createAdmin(
        raw,
        "owner",
        "a-strong-test-password-26",
      );
      const stored = raw
        .prepare("SELECT password_hash FROM admin_users WHERE id=?")
        .get(admin.id) as { password_hash: string };
      expect(stored.password_hash).toMatch(/^\$argon2id\$/);
      expect(stored.password_hash).not.toContain("a-strong-test-password-26");
      const invalid = await app.inject({
        method: "POST",
        url: "/api/v1/admin/auth/login",
        payload: { username: "owner", password: "wrong" },
      });
      expect(invalid.statusCode).toBe(401);
      expect(invalid.json()).toMatchObject({ code: "INVALID_CREDENTIALS" });
      const noToken = await app.inject({
        method: "GET",
        url: "/api/v1/admin/auth/me",
      });
      expect(noToken.statusCode).toBe(401);
      const login = await app.inject({
        method: "POST",
        url: "/api/v1/admin/auth/login",
        payload: { username: "owner", password: "a-strong-test-password-26" },
      });
      expect(login.statusCode).toBe(200);
      const { token, expiresAt } = login.json() as {
        token: string;
        expiresAt: number;
      };
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(findAdminSession(raw, token, expiresAt)).toBeNull();
      expect(
        raw.prepare("SELECT token_hash FROM admin_sessions").get(),
      ).not.toMatchObject({ token_hash: token });
      const header = { authorization: `Bearer ${token}` };
      const me = await app.inject({
        method: "GET",
        url: "/api/v1/admin/auth/me",
        headers: header,
      });
      expect(me.statusCode).toBe(200);
      expect(me.json()).toEqual(admin);
      raw
        .prepare("UPDATE admin_users SET status='disabled' WHERE id=?")
        .run(admin.id);
      const disabled = await app.inject({
        method: "GET",
        url: "/api/v1/admin/auth/me",
        headers: header,
      });
      expect(disabled.statusCode).toBe(401);
      raw
        .prepare("UPDATE admin_users SET status='active' WHERE id=?")
        .run(admin.id);
      const logout = await app.inject({
        method: "POST",
        url: "/api/v1/admin/auth/logout",
        headers: header,
      });
      expect(logout.statusCode).toBe(204);
      const revoked = await app.inject({
        method: "GET",
        url: "/api/v1/admin/auth/me",
        headers: header,
      });
      expect(revoked.statusCode).toBe(401);
    } finally {
      await app.close();
      raw.close();
    }
  });

  it("limits repeated failed login attempts", async () => {
    const { raw } = openDatabase(":memory:");
    const app = await buildApp({ database: raw });
    try {
      await createAdmin(raw, "owner", "a-strong-test-password-26");
      for (let i = 0; i < 5; i++) {
        const attempt = await app.inject({
          method: "POST",
          url: "/api/v1/admin/auth/login",
          payload: { username: "owner", password: "wrong" },
        });
        expect(attempt.statusCode).toBe(401);
      }
      const blocked = await app.inject({
        method: "POST",
        url: "/api/v1/admin/auth/login",
        payload: { username: "owner", password: "a-strong-test-password-26" },
      });
      expect(blocked.statusCode).toBe(429);
      expect(blocked.json()).toMatchObject({ code: "TOO_MANY_ATTEMPTS" });
    } finally {
      await app.close();
      raw.close();
    }
  });
});
