import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app, server } from "../src/server";
import { initializeConfigs, config } from "../src/config";

describe("server.ts and config integration", () => {
  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe("initializeConfigs", () => {
    it("should initialize and return configurations with timestamp", () => {
      const active = initializeConfigs();
      expect(active).toBeDefined();
      expect(active.app.port).toBeTypeOf("number");
      expect(active.app.nodeEnv).toBeDefined();
      expect(active.initializedAt).toBeTypeOf("string");
      expect(active.jwt).toBeDefined();
      expect(active.db).toBeDefined();
    });
  });

  describe("Express app middlewares and router mounting", () => {
    it("GET /api/health should return 200 status ok", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.timestamp).toBeDefined();
    });

    it("should return security headers from helmet", async () => {
      const res = await request(app).get("/api/health");
      expect(res.headers["x-dns-prefetch-control"]).toBeDefined();
      expect(res.headers["x-frame-options"]).toBeDefined();
    });

    it("should return 404 for unmatched routes with consistent error format", async () => {
      const res = await request(app).get("/api/v1/non-existent-endpoint");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        status: "error",
        message: "Route not found: GET /api/v1/non-existent-endpoint",
      });
    });
  });
});
