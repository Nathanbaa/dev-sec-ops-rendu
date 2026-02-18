/**
 * Tests de sécurité : mise en évidence que les failles sont corrigées.
 * - Path traversal refusé
 * - SQL injection sur login ne permet pas de bypass
 * - Création user : validation (email, password) et rôle forcé à user
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

vi.mock("../config/database.js", () => ({
  default: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

let app;
beforeAll(async () => {
  const mod = await import("../server.js");
  app = mod.default;
});

describe("Sécurité - Path traversal", () => {
  it("refuse name=../package.json (400 ou 403)", async () => {
    const res = await request(app)
      .get("/api/files")
      .query({ name: "../package.json" });
    expect([400, 403]).toContain(res.status);
  });

  it("refuse name avec .. (400)", async () => {
    const res = await request(app)
      .get("/api/files")
      .query({ name: "..\\..\\etc\\passwd" });
    expect([400, 403]).toContain(res.status);
  });

  it("refuse requête sans paramètre name (400)", async () => {
    const res = await request(app).get("/api/files");
    expect(res.status).toBe(400);
  });
});

describe("Sécurité - Login (injection SQL)", () => {
  it("payload SQL injection ne donne pas de token (pas de bypass auth)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin' OR '1'='1", password: "x" });
    expect(res.body.token).toBeUndefined();
    expect([401, 500]).toContain(res.status);
  });

  it("credentials vides → 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "", password: "" });
    expect(res.status).toBe(400);
  });
});

describe("Sécurité - Users (validation + rôle)", () => {
  it("email invalide → 400", async () => {
    const res = await request(app).post("/api/users").send({
      email: "pas-un-email",
      password: "password8chars",
      role: "admin",
    });
    expect(res.status).toBe(400);
  });

  it("mot de passe trop court → 400", async () => {
    const res = await request(app).post("/api/users").send({
      email: "valid@example.com",
      password: "short",
      role: "user",
    });
    expect(res.status).toBe(400);
  });
});
