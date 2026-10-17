import { Prisma, PrismaClient, Url } from "../generated/prisma/client";
import { BatchPayload } from "../generated/prisma/internal/prismaNamespace";
import {
  UrlCreateManyArgs,
  UrlDeleteManyArgs,
} from "../generated/prisma/models";

export type UrlWithoutId = Omit<Url, "id">;
export type SafeUrl = UrlWithoutId;

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<unknown>;
  del(key: string | string[]): Promise<unknown>;
}

export class UrlsRepository {
  private readonly db: PrismaClient;
  private readonly redis?: RedisClient;
  private readonly defaultTTL: number;

  constructor(
    db: PrismaClient,
    redis?: RedisClient,
    defaultTTL: number = 3600,
  ) {
    this.db = db;
    this.redis = redis;
    this.defaultTTL = defaultTTL;
  }

  private async getCachedUrl(shortCode: string): Promise<string | null> {
    if (!this.redis) {
      console.log(
        `Redis client not configured, falling back to Postgres for ${shortCode}`,
      );
      return null;
    }
    try {
      return await this.redis.get(shortCode);
    } catch (error) {
      console.error(
        `Redis get error for ${shortCode}, falling back to Postgres:`,
        error,
      );
      return null;
    }
  }

  private async updateCacheUrl(
    shortCode: string | null | undefined,
    longUrl: string,
    ttl: number = this.defaultTTL,
  ): Promise<void> {
    if (!this.redis || !shortCode) return;
    try {
      await this.redis.set(shortCode, longUrl, "EX", ttl);
    } catch (error) {
      console.error(`Redis set error for ${shortCode}:`, error);
    }
  }

  private async invalidateCache(
    shortCode: string | null | undefined,
  ): Promise<void> {
    if (!this.redis || !shortCode) return;
    try {
      await this.redis.del(shortCode);
    } catch (error) {
      console.error(`Redis invalidate error for ${shortCode}:`, error);
    }
  }

  async create(
    urlPayload: Prisma.UrlCreateInput | Prisma.UrlUncheckedCreateInput,
  ): Promise<Url> {
    const url = await this.db.url.create({
      data: urlPayload,
    });
    await this.updateCacheUrl(url.short_code, url.long_url);
    return url;
  }

  async createMany(arg: UrlCreateManyArgs): Promise<BatchPayload> {
    return this.db.url.createMany(arg);
  }

  async deleteById(id: number): Promise<UrlWithoutId> {
    const deleted = await this.db.url.delete({
      where: { id },
      omit: { id: true },
    });
    await this.invalidateCache(deleted.short_code);
    return deleted;
  }

  async deleteByShortCode(shortCode: string): Promise<UrlWithoutId> {
    const deleted = await this.db.url.delete({
      where: { short_code: shortCode },
      omit: { id: true },
    });
    await this.invalidateCache(shortCode);
    return deleted;
  }

  async deleteManyById(arg: UrlDeleteManyArgs): Promise<BatchPayload> {
    return this.db.url.deleteMany(arg);
  }

  async getLongUrlById(id: number): Promise<{ long_url: string } | null> {
    const url = await this.db.url.findUnique({
      where: { id },
      select: { long_url: true, short_code: true },
    });
    if (url) {
      await this.updateCacheUrl(url.short_code, url.long_url);
      return { long_url: url.long_url };
    }
    return null;
  }

  async getLongUrlByShortCode(shortCode: string): Promise<string | null> {
    const cachedLongUrl = await this.getCachedUrl(shortCode);
    if (cachedLongUrl) {
      return cachedLongUrl;
    }
    console.log(`Cache miss for ${shortCode}, falling back to Postgres`);
    const url = await this.db.url.findUnique({
      where: { short_code: shortCode },
      select: { long_url: true },
    });
    if (url) {
      await this.updateCacheUrl(shortCode, url.long_url);
      return url.long_url;
    }
    return null;
  }

  async getShortCodeById(
    id: number,
  ): Promise<{ short_code: string | null } | null> {
    return this.db.url.findUnique({
      where: { id },
      select: { short_code: true },
    });
  }

  async getByIdAndAuthorId(
    id: number,
    authorId: string,
  ): Promise<UrlWithoutId | null> {
    return this.db.url.findFirst({
      where: {
        id,
        OR: [{ createdBy: authorId }, { guestId: authorId }],
      },
      omit: { id: true },
    });
  }

  async getByAuthorId(
    id: number,
    authorId: string,
  ): Promise<UrlWithoutId | null> {
    return this.getByIdAndAuthorId(id, authorId);
  }

  async modifyById(
    id: number,
    data: Prisma.UrlUpdateInput | Prisma.UrlUncheckedUpdateInput,
  ): Promise<UrlWithoutId> {
    const updated = await this.db.url.update({
      where: { id },
      data,
      omit: { id: true },
    });
    await this.updateCacheUrl(updated.short_code, updated.long_url);
    return updated;
  }

  async updateShortCodeById(
    id: number,
    shortCode: string,
  ): Promise<{ short_code: string | null; long_url: string }> {
    const updated = await this.db.url.update({
      where: { id },
      data: { short_code: shortCode },
      select: {
        short_code: true,
        long_url: true,
      },
    });
    await this.updateCacheUrl(updated.short_code, updated.long_url);
    return updated;
  }

  async updateShortCodeByShortCode(
    currentShortCode: string,
    newShortCode: string,
  ): Promise<{ short_code: string | null; long_url: string }> {
    const updated = await this.db.url.update({
      where: { short_code: currentShortCode },
      data: { short_code: newShortCode },
      select: {
        short_code: true,
        long_url: true,
      },
    });
    await this.invalidateCache(currentShortCode);
    await this.updateCacheUrl(updated.short_code, updated.long_url);
    return updated;
  }

  async updateByShortCode(
    shortCode: string,
    data: Prisma.UrlUpdateInput | Prisma.UrlUncheckedUpdateInput,
  ): Promise<UrlWithoutId> {
    const updated = await this.db.url.update({
      where: { short_code: shortCode },
      data,
      omit: { id: true },
    });
    await this.invalidateCache(shortCode);
    await this.updateCacheUrl(updated.short_code, updated.long_url);
    return updated;
  }

  async getUrlsByUserId(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<UrlWithoutId[]> {
    return this.db.url.findMany({
      where: { createdBy: userId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
      omit: { id: true },
    });
  }

  async getUrlsByGuestId(
    guestId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<UrlWithoutId[]> {
    return this.db.url.findMany({
      where: { guestId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
      omit: { id: true },
    });
  }

  async getByShortCode(shortCode: string): Promise<UrlWithoutId | null> {
    return this.db.url.findUnique({
      where: { short_code: shortCode },
      omit: { id: true },
    });
  }
}
