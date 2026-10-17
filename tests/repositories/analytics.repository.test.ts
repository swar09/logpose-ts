import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsRepository } from "../../src/repositories/analytics.repository";
import * as mongoLib from "../../src/lib/mongodb";

describe("AnalyticsRepository (MongoDB-native)", () => {
  let mockRawClicksCol: any;
  let mockUrlMetricsCol: any;
  let repo: AnalyticsRepository;

  beforeEach(() => {
    mockRawClicksCol = {
      insertOne: vi.fn(),
      insertMany: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    };

    mockUrlMetricsCol = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
    };

    vi.spyOn(mongoLib, "getRawClicksCollection").mockResolvedValue(mockRawClicksCol);
    vi.spyOn(mongoLib, "getUrlMetricsCollection").mockResolvedValue(mockUrlMetricsCol);

    repo = new AnalyticsRepository();
  });

  describe("add and batchAdd", () => {
    it("should add a single analytics record to raw_clicks", async () => {
      const input = {
        shortCode: "test1",
        clickedAt: new Date("2026-10-17T12:00:00Z"),
        ipAddress: "127.0.0.1",
        userAgent: "agent",
        device: "desktop",
        countryCode: "US",
        referer: "direct",
      };
      mockRawClicksCol.insertOne.mockResolvedValue({ insertedId: "507f1f77bcf86cd799439011" });

      const result = await repo.add(input);
      expect(mockRawClicksCol.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ shortCode: "test1", ipAddress: "127.0.0.1" }),
      );
      expect(result.id).toBe("507f1f77bcf86cd799439011");
    });

    it("should batch add analytics records to raw_clicks", async () => {
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
      mockRawClicksCol.insertMany.mockResolvedValue({ insertedCount: 1 });

      const result = await repo.batchAdd(inputs);
      expect(mockRawClicksCol.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ shortCode: "test1" })]),
        { ordered: false },
      );
      expect(result.count).toBe(1);
    });
  });

  describe("findById", () => {
    it("should find an analytics record by ID from raw_clicks", async () => {
      const mockDoc = {
        _id: "507f1f77bcf86cd799439011",
        shortCode: "test1",
        clickedAt: new Date("2026-10-17T12:00:00Z"),
        ipAddress: "127.0.0.1",
        userAgent: "agent",
        device: "desktop",
        countryCode: "US",
        referer: "direct",
      };
      mockRawClicksCol.findOne.mockResolvedValue(mockDoc);

      const result = await repo.findById("507f1f77bcf86cd799439011");
      expect(mockRawClicksCol.findOne).toHaveBeenCalled();
      expect(result?.id).toBe("507f1f77bcf86cd799439011");
      expect(result?.shortCode).toBe("test1");
    });

    it("should return null if record does not exist", async () => {
      mockRawClicksCol.findOne.mockResolvedValue(null);
      const result = await repo.findById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("findManyWithCount", () => {
    it("should return paginated raw clicks and total count", async () => {
      const mockDocs = [
        {
          _id: "id1",
          shortCode: "test1",
          clickedAt: new Date("2026-10-17T12:00:00Z"),
          ipAddress: "127.0.0.1",
          userAgent: "agent",
          device: "desktop",
          countryCode: "US",
          referer: "direct",
        },
      ];

      mockRawClicksCol.find().toArray.mockResolvedValue(mockDocs);
      mockRawClicksCol.countDocuments.mockResolvedValue(1);

      const { data, total } = await repo.findManyWithCount(
        { shortCode: "test1" },
        { page: 1, pageSize: 10 },
      );

      expect(total).toBe(1);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("id1");
    });
  });

  describe("getStats", () => {
    it("should compute dynamic aggregation statistics using $facet", async () => {
      mockRawClicksCol.aggregate().toArray.mockResolvedValue([
        {
          totalClicks: [{ count: 42 }],
          clicksByDevice: [{ device: "desktop", count: 30 }],
          clicksByCountry: [{ countryCode: "US", count: 40 }],
          clicksByReferer: [{ referer: "direct", count: 25 }],
        },
      ]);

      const stats = await repo.getStats({ shortCode: "test1" });

      expect(stats.totalClicks).toBe(42);
      expect(stats.clicksByDevice).toEqual([{ device: "desktop", count: 30 }]);
      expect(stats.clicksByCountry).toEqual([{ countryCode: "US", count: 40 }]);
      expect(stats.clicksByReferer).toEqual([{ referer: "direct", count: 25 }]);
    });
  });

  describe("getMetrics (Pre-aggregated url_metrics)", () => {
    it("should retrieve daily rollup metrics and compute overall summary", async () => {
      const mockMetrics = [
        {
          _id: "test1:2026-10-17",
          shortCode: "test1",
          date: "2026-10-17",
          totalClicks: 100,
          devices: { desktop: 70, mobile: 30 },
          countries: { US: 80, CA: 20 },
          browsers: { Chrome: 90 },
          referers: { direct: 60, "twitter_com": 40 },
          updatedAt: new Date(),
        },
        {
          _id: "test1:2026-10-16",
          shortCode: "test1",
          date: "2026-10-16",
          totalClicks: 50,
          devices: { desktop: 30, mobile: 20 },
          countries: { US: 40, UK: 10 },
          browsers: { Chrome: 40 },
          referers: { direct: 50 },
          updatedAt: new Date(),
        },
      ];

      mockUrlMetricsCol.find().toArray.mockResolvedValue(mockMetrics);
      mockUrlMetricsCol.countDocuments.mockResolvedValue(2);

      const result = await repo.getMetrics(
        { shortCode: "test1", fromDate: "2026-10-16", toDate: "2026-10-17" },
        { page: 1, pageSize: 30 },
      );

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.summary.totalClicks).toBe(150);
      expect(result.summary.devices.desktop).toBe(100);
      expect(result.summary.devices.mobile).toBe(50);
      expect(result.summary.countries.US).toBe(120);
      expect(result.summary.referers.direct).toBe(110);
    });
  });
});
