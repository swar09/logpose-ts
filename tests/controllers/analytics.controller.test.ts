import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAnalytics,
  getAnalyticsById,
  getAnalyticsStats,
  getShortCodeAnalytics,
  getShortCodeAnalyticsStats,
  getUrlMetrics,
  getShortCodeMetrics,
  isUserAdmin,
  canAccessUrlAnalytics,
} from "../../src/controllers/analytics.controller";
import { analyticsRepo, urlRepo } from "../../src/repositories";
import { UserRole } from "../../src/models/users.model";

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    locals: {},
  };
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((data: any) => {
    res.data = data;
    return res;
  });
  return res;
}

describe("analytics.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("helper functions", () => {
    it("isUserAdmin correctly identifies admin role", () => {
      expect(isUserAdmin(UserRole.ADMIN)).toBe(true);
      expect(isUserAdmin("ADMIN")).toBe(true);
      expect(isUserAdmin(UserRole.USER)).toBe(false);
      expect(isUserAdmin(undefined)).toBe(false);
    });

    it("canAccessUrlAnalytics permits admin, public url, or URL owner", () => {
      expect(canAccessUrlAnalytics("user-1", UserRole.ADMIN, "user-2")).toBe(
        true,
      );
      expect(canAccessUrlAnalytics("user-1", UserRole.USER, null)).toBe(true);
      expect(canAccessUrlAnalytics("user-1", UserRole.USER, "user-1")).toBe(
        true,
      );
      expect(canAccessUrlAnalytics("user-1", UserRole.USER, "user-2")).toBe(
        false,
      );
    });
  });

  describe("getAnalytics", () => {
    it("should return paginated analytics for a user scoped to their own urls", async () => {
      const mockData = [
        {
          id: "uuid-1",
          shortCode: "code1",
          clickedAt: new Date("2026-10-15T12:00:00Z"),
          ipAddress: "1.2.3.4",
          userAgent: "Mozilla",
          device: "desktop",
          countryCode: "US",
          referer: "direct",
        },
      ];

      vi.spyOn(analyticsRepo, "findManyWithCount").mockResolvedValue({
        data: mockData as any,
        total: 1,
      });

      const req: any = {
        claims: { sub: "user-123", role: UserRole.USER },
        query: { page: "1", pageSize: "10" },
      };
      const res = createMockResponse();

      await getAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.data).toEqual({
        status: "success",
        data: mockData,
        pagination: {
          total: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
      expect(analyticsRepo.findManyWithCount).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-123" }),
        expect.objectContaining({ page: 1, pageSize: 10 }),
        true,
      );
    });

    it("should allow an admin to query all analytics without userId restriction", async () => {
      vi.spyOn(analyticsRepo, "findManyWithCount").mockResolvedValue({
        data: [],
        total: 0,
      });

      const req: any = {
        claims: { sub: "admin-1", role: UserRole.ADMIN },
        query: { device: "mobile", country_code: "US" },
      };
      const res = createMockResponse();

      await getAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(analyticsRepo.findManyWithCount).toHaveBeenCalledWith(
        expect.objectContaining({
          device: "mobile",
          countryCode: "US",
        }),
        expect.any(Object),
        true,
      );
      // Admin query should not have userId set
      const filterArg = vi.mocked(analyticsRepo.findManyWithCount).mock
        .calls[0][0];
      expect(filterArg?.userId).toBeUndefined();
    });

    it("should return 404 if short_code is provided but URL does not exist", async () => {
      vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue(null);

      const req: any = {
        claims: { sub: "user-123", role: UserRole.USER },
        query: { short_code: "nonexistent" },
      };
      const res = createMockResponse();

      await getAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.data).toEqual({
        status: "error",
        message: "URL not found",
      });
    });

    it("should return 403 if user queries a short_code they do not own", async () => {
      vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue({
        short_code: "code1",
        long_url: "https://example.com",
        createdBy: "different-user",
        guestId: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req: any = {
        claims: { sub: "user-123", role: UserRole.USER },
        query: { short_code: "code1" },
      };
      const res = createMockResponse();

      await getAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.data).toEqual({
        status: "error",
        message:
          "Forbidden: You are not authorized to view analytics for this URL",
      });
    });

    it("should return 500 when repo throws an error", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(analyticsRepo, "findManyWithCount").mockRejectedValue(
        new Error("Database connection lost"),
      );

      const req: any = {
        claims: { sub: "user-123", role: UserRole.USER },
        query: {},
      };
      const res = createMockResponse();

      await getAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.data).toEqual({
        status: "error",
        message: "Internal server error",
      });
    });
  });

  describe("getAnalyticsById", () => {
    it("should return 404 if analytics record is not found", async () => {
      vi.spyOn(analyticsRepo, "findById").mockResolvedValue(null);

      const req: any = {
        params: { id: "a0000000-0000-0000-0000-000000000001" },
        claims: { sub: "user-123", role: UserRole.USER },
      };
      const res = createMockResponse();

      await getAnalyticsById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.data).toEqual({
        status: "error",
        message: "Analytics record not found",
      });
    });

    it("should return 403 if record belongs to a URL owned by someone else", async () => {
      vi.spyOn(analyticsRepo, "findById").mockResolvedValue({
        id: "a0000000-0000-0000-0000-000000000001",
        shortCode: "code99",
        clickedAt: new Date(),
        ipAddress: "1.1.1.1",
        userAgent: "Agent",
        device: "desktop",
        countryCode: "US",
        referer: "direct",
      });

      vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue({
        short_code: "code99",
        long_url: "https://other.com",
        createdBy: "owner-999",
        guestId: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req: any = {
        params: { id: "a0000000-0000-0000-0000-000000000001" },
        claims: { sub: "user-123", role: UserRole.USER },
      };
      const res = createMockResponse();

      await getAnalyticsById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.data).toEqual({
        status: "error",
        message:
          "Forbidden: You are not authorized to view this analytics record",
      });
    });

    it("should return 200 with analytics record for authorized user", async () => {
      const mockRecord = {
        id: "a0000000-0000-0000-0000-000000000001",
        shortCode: "code12",
        clickedAt: new Date(),
        ipAddress: "1.1.1.1",
        userAgent: "Agent",
        device: "desktop",
        countryCode: "US",
        referer: "direct",
      };

      vi.spyOn(analyticsRepo, "findById").mockResolvedValue(mockRecord);
      vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue({
        short_code: "code12",
        long_url: "https://owner.com",
        createdBy: "user-123",
        guestId: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req: any = {
        params: { id: "a0000000-0000-0000-0000-000000000001" },
        claims: { sub: "user-123", role: UserRole.USER },
      };
      const res = createMockResponse();

      await getAnalyticsById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.data).toEqual({
        status: "success",
        data: mockRecord,
      });
    });
  });

  describe("getAnalyticsStats", () => {
    it("should return aggregated stats", async () => {
      const mockStats = {
        totalClicks: 42,
        clicksByDevice: [{ device: "mobile", count: 30 }],
        clicksByCountry: [{ countryCode: "US", count: 42 }],
        clicksByReferer: [{ referer: "google.com", count: 20 }],
      };

      vi.spyOn(analyticsRepo, "getStats").mockResolvedValue(mockStats);

      const req: any = {
        claims: { sub: "user-123", role: UserRole.USER },
        query: {},
      };
      const res = createMockResponse();

      await getAnalyticsStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.data).toEqual({
        status: "success",
        data: mockStats,
      });
      expect(analyticsRepo.getStats).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-123" }),
      );
    });

    it("should verify short_code ownership when requested in stats", async () => {
      vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue(null);

      const req: any = {
        claims: { sub: "user-123", role: UserRole.USER },
        query: { short_code: "invalid" },
      };
      const res = createMockResponse();

      await getAnalyticsStats(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getShortCodeAnalytics", () => {
    it("should return 404 if URL does not exist", async () => {
      vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue(null);

      const req: any = {
        params: { short_code: "notfound" },
        query: {},
        claims: { sub: "user-1", role: UserRole.USER },
      };
      const res = createMockResponse();

      await getShortCodeAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 403 if user is not author of the URL", async () => {
      vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue({
        short_code: "code1",
        long_url: "https://example.com",
        createdBy: "other-user",
        guestId: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req: any = {
        params: { short_code: "code1" },
        query: {},
        claims: { sub: "user-1", role: UserRole.USER },
      };
      const res = createMockResponse();

      await getShortCodeAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should return paginated analytics for URL owner", async () => {
      vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue({
        short_code: "code1",
        long_url: "https://example.com",
        createdBy: "user-1",
        guestId: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockData = [
        {
          id: "uuid-1",
          shortCode: "code1",
          clickedAt: new Date(),
          ipAddress: "1.2.3.4",
          userAgent: "Agent",
          device: "desktop",
          countryCode: "US",
          referer: "direct",
        },
      ];

      vi.spyOn(analyticsRepo, "findManyWithCount").mockResolvedValue({
        data: mockData as any,
        total: 1,
      });

      const req: any = {
        params: { short_code: "code1" },
        query: { page: "1", pageSize: "20" },
        claims: { sub: "user-1", role: UserRole.USER },
      };
      const res = createMockResponse();

      await getShortCodeAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.data).toEqual({
        status: "success",
        short_code: "code1",
        data: mockData,
        pagination: {
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });
  });

  describe("getShortCodeAnalyticsStats", () => {
    it("should return stats for specific short code", async () => {
      vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue({
        short_code: "code1",
        long_url: "https://example.com",
        createdBy: "user-1",
        guestId: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockStats = {
        totalClicks: 10,
        clicksByDevice: [{ device: "tablet", count: 10 }],
        clicksByCountry: [{ countryCode: "CA", count: 10 }],
        clicksByReferer: [{ referer: "direct", count: 10 }],
      };

      vi.spyOn(analyticsRepo, "getStats").mockResolvedValue(mockStats);

      const req: any = {
        params: { short_code: "code1" },
        query: {},
        claims: { sub: "user-1", role: UserRole.USER },
      };
      const res = createMockResponse();

      await getShortCodeAnalyticsStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.data).toEqual({
        status: "success",
        short_code: "code1",
        data: mockStats,
      });
      expect(analyticsRepo.getStats).toHaveBeenCalledWith(
        expect.objectContaining({ shortCode: "code1" }),
      );
    });
  });

  describe("getUrlMetrics (MongoDB url_metrics)", () => {
    it("should fetch pre-aggregated metrics rollups and summary", async () => {
      const mockResult = {
        data: [
          {
            _id: "code1:2026-10-17",
            shortCode: "code1",
            date: "2026-10-17",
            totalClicks: 50,
            devices: { desktop: 50 },
            countries: { US: 50 },
            browsers: { Chrome: 50 },
            referers: { direct: 50 },
            updatedAt: new Date(),
          },
        ],
        total: 1,
        summary: {
          totalClicks: 50,
          devices: { desktop: 50 },
          countries: { US: 50 },
          browsers: { Chrome: 50 },
          referers: { direct: 50 },
        },
      };

      vi.spyOn(analyticsRepo, "getMetrics").mockResolvedValue(mockResult as any);

      const req: any = {
        claims: { sub: "user-1", role: UserRole.USER },
        query: { from: "2026-10-01", to: "2026-10-17" },
      };
      const res = createMockResponse();

      await getUrlMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.data.status).toBe("success");
      expect(res.data.source).toBe("url_metrics");
      expect(res.data.data).toHaveLength(1);
      expect(res.data.summary.totalClicks).toBe(50);
      expect(analyticsRepo.getMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          fromDate: "2026-10-01",
          toDate: "2026-10-17",
        }),
        expect.objectContaining({ page: 1, pageSize: 30 }),
      );
    });
  });

  describe("getShortCodeMetrics", () => {
    it("should fetch metrics for an authorized short code", async () => {
      vi.spyOn(urlRepo, "getByShortCode").mockResolvedValue({
        short_code: "code1",
        long_url: "https://example.com",
        createdBy: "user-1",
        guestId: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockResult = {
        data: [],
        total: 0,
        summary: {
          totalClicks: 0,
          devices: {},
          countries: {},
          browsers: {},
          referers: {},
        },
      };

      vi.spyOn(analyticsRepo, "getMetrics").mockResolvedValue(mockResult as any);

      const req: any = {
        params: { short_code: "code1" },
        claims: { sub: "user-1", role: UserRole.USER },
        query: {},
      };
      const res = createMockResponse();

      await getShortCodeMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.data.status).toBe("success");
      expect(res.data.short_code).toBe("code1");
      expect(analyticsRepo.getMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ shortCode: "code1" }),
        expect.any(Object),
      );
    });
  });
});
