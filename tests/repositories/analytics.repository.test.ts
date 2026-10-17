import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsRepository } from "../../src/repositories/analytics.repository";

describe("AnalyticsRepository", () => {
  let mockPrisma: any;
  let repo: AnalyticsRepository;

  beforeEach(() => {
    mockPrisma = {
      analytics: {
        create: vi.fn(),
        createMany: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
    };
    repo = new AnalyticsRepository(mockPrisma);
  });

  describe("add and batchAdd", () => {
    it("should add a single analytics record", async () => {
      const input = {
        shortCode: "test1",
        clickedAt: new Date(),
        ipAddress: "127.0.0.1",
        userAgent: "agent",
        device: "desktop",
        countryCode: "US",
        referer: "direct",
      };
      mockPrisma.analytics.create.mockResolvedValue({ id: "uuid-1", ...input });

      const result = await repo.add(input as any);
      expect(mockPrisma.analytics.create).toHaveBeenCalledWith({ data: input });
      expect(result.id).toBe("uuid-1");
    });

    it("should batch add analytics records", async () => {
      const inputs = [
        {
          shortCode: "test1",
          clickedAt: new Date(),
          ipAddress: "127.0.0.1",
          userAgent: "agent",
          device: "desktop",
          countryCode: "US",
          referer: "direct",
        },
      ];
      mockPrisma.analytics.createMany.mockResolvedValue({ count: 1 });

      const result = await repo.batchAdd(inputs as any);
      expect(mockPrisma.analytics.createMany).toHaveBeenCalledWith({
        data: inputs,
      });
      expect(result.count).toBe(1);
    });
  });

  describe("findById", () => {
    it("should find an analytics record by ID without relations", async () => {
      mockPrisma.analytics.findUnique.mockResolvedValue({ id: "uuid-1" });

      const result = await repo.findById("uuid-1");
      expect(mockPrisma.analytics.findUnique).toHaveBeenCalledWith({
        where: { id: "uuid-1" },
      });
      expect(result).toEqual({ id: "uuid-1" });
    });

    it("should include urlAnalytics when includeUrl is true", async () => {
      mockPrisma.analytics.findUnique.mockResolvedValue({
        id: "uuid-1",
        urlAnalytics: { long_url: "https://example.com" },
      });

      const result = await repo.findById("uuid-1", true);
      expect(mockPrisma.analytics.findUnique).toHaveBeenCalledWith({
        where: { id: "uuid-1" },
        include: { urlAnalytics: true },
      });
      expect(result?.urlAnalytics).toBeDefined();
    });
  });

  describe("findAllByShortCode and findInIntervalByShortCode", () => {
    it("should findAllByShortCode with pagination", async () => {
      mockPrisma.analytics.findMany.mockResolvedValue([{ id: "uuid-1" }]);

      const result = await repo.findAllByShortCode("code1", 2, 10);
      expect(mockPrisma.analytics.findMany).toHaveBeenCalledWith({
        where: { shortCode: "code1" },
        skip: 10,
        take: 10,
        orderBy: { clickedAt: "desc" },
      });
      expect(result).toHaveLength(1);
    });

    it("should findInIntervalByShortCode", async () => {
      const start = new Date("2026-01-01");
      const end = new Date("2026-01-02");
      mockPrisma.analytics.findMany.mockResolvedValue([{ id: "uuid-1" }]);

      await repo.findInIntervalByShortCode("code1", start, end, 1, 20);
      expect(mockPrisma.analytics.findMany).toHaveBeenCalledWith({
        where: {
          shortCode: "code1",
          clickedAt: { gte: start, lte: end },
        },
        skip: 0,
        take: 20,
        orderBy: { clickedAt: "desc" },
      });
    });
  });

  describe("count and countByShortCode", () => {
    it("should count records with filters", async () => {
      mockPrisma.analytics.count.mockResolvedValue(5);

      const count = await repo.count({ countryCode: "US" });
      expect(mockPrisma.analytics.count).toHaveBeenCalledWith({
        where: {
          countryCode: { equals: "US", mode: "insensitive" },
        },
      });
      expect(count).toBe(5);
    });

    it("should countByShortCode", async () => {
      mockPrisma.analytics.count.mockResolvedValue(12);

      const count = await repo.countByShortCode("short1");
      expect(mockPrisma.analytics.count).toHaveBeenCalledWith({
        where: { shortCode: "short1" },
      });
      expect(count).toBe(12);
    });
  });

  describe("findMany and findManyWithCount", () => {
    it("should findMany with custom sorting and filters", async () => {
      mockPrisma.analytics.findMany.mockResolvedValue([]);

      await repo.findMany(
        {
          shortCode: ["c1", "c2"],
          device: "mobile",
          referer: "google",
          userId: "user-1",
        },
        {
          page: 1,
          pageSize: 25,
          sortBy: "countryCode",
          sortOrder: "asc",
        },
      );

      expect(mockPrisma.analytics.findMany).toHaveBeenCalledWith({
        where: {
          shortCode: { in: ["c1", "c2"] },
          device: { equals: "mobile", mode: "insensitive" },
          referer: { contains: "google", mode: "insensitive" },
          urlAnalytics: { is: { createdBy: "user-1" } },
        },
        skip: 0,
        take: 25,
        orderBy: { countryCode: "asc" },
      });
    });

    it("should findManyWithCount returning data and total", async () => {
      mockPrisma.analytics.findMany.mockResolvedValue([{ id: "uuid-1" }]);
      mockPrisma.analytics.count.mockResolvedValue(1);

      const res = await repo.findManyWithCount(
        { id: "uuid-1" },
        { page: 1, pageSize: 20 },
        true,
      );

      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(mockPrisma.analytics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { urlAnalytics: true },
        }),
      );
    });
  });

  describe("getStats", () => {
    it("should aggregate clicks by device, country, and referer", async () => {
      mockPrisma.analytics.count.mockResolvedValue(100);
      mockPrisma.analytics.groupBy
        .mockResolvedValueOnce([
          { device: "mobile", _count: { _all: 60 } },
          { device: "desktop", _count: { _all: 40 } },
        ])
        .mockResolvedValueOnce([{ countryCode: "US", _count: { _all: 100 } }])
        .mockResolvedValueOnce([{ referer: "direct", _count: { _all: 100 } }]);

      const stats = await repo.getStats({ shortCode: "code1" });

      expect(stats).toEqual({
        totalClicks: 100,
        clicksByDevice: [
          { device: "mobile", count: 60 },
          { device: "desktop", count: 40 },
        ],
        clicksByCountry: [{ countryCode: "US", count: 100 }],
        clicksByReferer: [{ referer: "direct", count: 100 }],
      });
    });
  });
});
