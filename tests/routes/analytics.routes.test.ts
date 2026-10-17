import crypto from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { analyticsRouter } from "../../src/routes/analytics.routes";
import { analyticsRepo, urlRepo } from "../../src/repositories";
import { createAuthToken } from "../../src/lib/jwt";
import { UserRole } from "../../src/models/users.model";

describe("analytics.routes integration", () => {
  let app: express.Express;
  let userToken: string;
  let userId: string;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/api/v1/analytics", analyticsRouter);

    userId = crypto.randomUUID();
    const authResult = createAuthToken({
      id: userId,
      role: UserRole.USER,
    });
    userToken = authResult.token;
  });

  it("GET /api/v1/analytics requires Authorization header", async () => {
    const res = await request(app).get("/api/v1/analytics");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/analytics succeeds with valid auth and returns paginated response", async () => {
    vi.spyOn(analyticsRepo, "findManyWithCount").mockResolvedValue({
      data: [
        {
          id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          shortCode: "xyz123",
          clickedAt: new Date("2026-10-15T10:00:00Z"),
          ipAddress: "127.0.0.1",
          userAgent: "test-agent",
          device: "desktop",
          countryCode: "US",
          referer: "direct",
        },
      ] as any,
      total: 1,
    });

    const res = await request(app)
      .get("/api/v1/analytics?page=1&pageSize=10")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.pagination).toEqual({
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /api/v1/analytics/stats returns aggregated statistics", async () => {
    vi.spyOn(analyticsRepo, "getStats").mockResolvedValue({
      totalClicks: 25,
      clicksByDevice: [{ device: "mobile", count: 25 }],
      clicksByCountry: [{ countryCode: "US", count: 25 }],
      clicksByReferer: [{ referer: "direct", count: 25 }],
    });

    const res = await request(app)
      .get("/api/v1/analytics/stats")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.totalClicks).toBe(25);
  });

  it("GET /api/v1/analytics/urls/:short_code validates short_code and returns analytics", async () => {
    vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue({
      short_code: "abc1234",
      long_url: "https://example.com",
      createdBy: userId,
      guestId: null,
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(analyticsRepo, "findManyWithCount").mockResolvedValue({
      data: [] as any,
      total: 0,
    });

    const res = await request(app)
      .get("/api/v1/analytics/urls/abc1234")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.short_code).toBe("abc1234");
  });

  it("GET /api/v1/analytics/urls/:short_code fails validation if short_code exceeds 7 chars", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/urls/toolongcode")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed");
  });

  it("GET /api/v1/analytics/:id validates UUID parameter", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/not-a-valid-uuid")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed");
  });

  it("GET /api/v1/analytics/:id loads analytics record with valid UUID", async () => {
    const validUuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    vi.spyOn(analyticsRepo, "findById").mockResolvedValue({
      id: validUuid,
      shortCode: "code1",
      clickedAt: new Date(),
      ipAddress: "127.0.0.1",
      userAgent: "Agent",
      device: "mobile",
      countryCode: "US",
      referer: "direct",
    });

    vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue({
      short_code: "code1",
      long_url: "https://example.com",
      createdBy: userId,
      guestId: null,
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/v1/analytics/${validUuid}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.id).toBe(validUuid);
  });
});
