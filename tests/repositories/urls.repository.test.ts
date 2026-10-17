import { describe, it, expect, vi, beforeEach } from "vitest";
import { UrlsRepository } from "../../src/repositories/urls.repository";

describe("UrlsRepository Redis & Postgres Fallback", () => {
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockDb = {
      url: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
      },
    };

    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };
  });

  describe("getLongUrlByShortCode", () => {
    it("should return cached URL when Redis has a cache hit", async () => {
      mockRedis.get.mockResolvedValue("https://cached-example.com");

      const repo = new UrlsRepository(mockDb, mockRedis);
      const result = await repo.getLongUrlByShortCode("abc1234");

      expect(result).toBe("https://cached-example.com");
      expect(mockRedis.get).toHaveBeenCalledWith("abc1234");
      // Postgres should NOT be queried when cache hits
      expect(mockDb.url.findUnique).not.toHaveBeenCalled();
    });

    it("should smoothly fall back to Postgres when Redis is not configured", async () => {
      mockDb.url.findUnique.mockResolvedValue({
        long_url: "https://postgres-example.com",
      });

      // No redis client provided
      const repo = new UrlsRepository(mockDb, undefined);
      const result = await repo.getLongUrlByShortCode("abc1234");

      expect(result).toBe("https://postgres-example.com");
      expect(mockDb.url.findUnique).toHaveBeenCalledWith({
        where: { short_code: "abc1234" },
        select: { long_url: true },
      });
    });

    it("should smoothly fall back to Postgres when Redis throws a network/connection error", async () => {
      // Simulate Redis being down / crashing
      mockRedis.get.mockRejectedValue(new Error("ECONNREFUSED: Redis connection lost"));
      mockDb.url.findUnique.mockResolvedValue({
        long_url: "https://postgres-fallback.com",
      });

      const repo = new UrlsRepository(mockDb, mockRedis);
      const result = await repo.getLongUrlByShortCode("abc1234");

      expect(result).toBe("https://postgres-fallback.com");
      expect(mockRedis.get).toHaveBeenCalledWith("abc1234");
      expect(mockDb.url.findUnique).toHaveBeenCalledWith({
        where: { short_code: "abc1234" },
        select: { long_url: true },
      });
    });

    it("should not crash if Redis set fails when populating cache after Postgres fetch", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockRejectedValue(new Error("Redis write timeout"));
      mockDb.url.findUnique.mockResolvedValue({
        long_url: "https://postgres-example.com",
      });

      const repo = new UrlsRepository(mockDb, mockRedis);
      const result = await repo.getLongUrlByShortCode("abc1234");

      expect(result).toBe("https://postgres-example.com");
      expect(mockDb.url.findUnique).toHaveBeenCalled();
    });
  });

  describe("create and delete cache resilience", () => {
    it("should successfully create record in Postgres even if Redis set throws an error", async () => {
      mockRedis.set.mockRejectedValue(new Error("Redis OOM error"));
      mockDb.url.create.mockResolvedValue({
        id: 1,
        short_code: "code1",
        long_url: "https://example.com",
      });

      const repo = new UrlsRepository(mockDb, mockRedis);
      const created = await repo.create({
        short_code: "code1",
        long_url: "https://example.com",
        expiresAt: new Date(),
      });

      expect(created.id).toBe(1);
      expect(mockDb.url.create).toHaveBeenCalled();
    });

    it("should successfully delete from Postgres even if Redis cache invalidation fails", async () => {
      mockRedis.del.mockRejectedValue(new Error("Redis disconnected"));
      mockDb.url.delete.mockResolvedValue({
        short_code: "code1",
        long_url: "https://example.com",
      });

      const repo = new UrlsRepository(mockDb, mockRedis);
      const deleted = await repo.deleteByShortCode("code1");

      expect(deleted.short_code).toBe("code1");
      expect(mockDb.url.delete).toHaveBeenCalledWith({
        where: { short_code: "code1" },
        omit: { id: true },
      });
    });
  });
});
