import { Analytics, Prisma, PrismaClient } from "../generated/prisma/client";
import { BatchPayload } from "../generated/prisma/internal/prismaNamespace";

export interface AnalyticsFilterCriteria {
  id?: string;
  shortCode?: string | string[];
  userId?: string;
  startTime?: Date;
  endTime?: Date;
  countryCode?: string;
  device?: string;
  ipAddress?: string;
  referer?: string;
}

export interface AnalyticsPaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: "clickedAt" | "shortCode" | "countryCode" | "device";
  sortOrder?: "asc" | "desc";
}

export interface DeviceCount {
  device: string;
  count: number;
}

export interface CountryCount {
  countryCode: string;
  count: number;
}

export interface RefererCount {
  referer: string;
  count: number;
}

export interface AnalyticsStatsResult {
  totalClicks: number;
  clicksByDevice: DeviceCount[];
  clicksByCountry: CountryCount[];
  clicksByReferer: RefererCount[];
}

export class AnalyticsRepository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
  }

  private buildWhereClause(
    filter?: AnalyticsFilterCriteria,
  ): Prisma.AnalyticsWhereInput {
    if (!filter) return {};
    const where: Prisma.AnalyticsWhereInput = {};

    if (filter.id) {
      where.id = filter.id;
    }

    if (filter.shortCode) {
      if (Array.isArray(filter.shortCode)) {
        where.shortCode = { in: filter.shortCode };
      } else {
        where.shortCode = filter.shortCode;
      }
    }

    if (filter.startTime || filter.endTime) {
      where.clickedAt = {};
      if (filter.startTime) {
        where.clickedAt.gte = filter.startTime;
      }
      if (filter.endTime) {
        where.clickedAt.lte = filter.endTime;
      }
    }

    if (filter.countryCode) {
      where.countryCode = { equals: filter.countryCode, mode: "insensitive" };
    }

    if (filter.device) {
      where.device = { equals: filter.device, mode: "insensitive" };
    }

    if (filter.ipAddress) {
      where.ipAddress = filter.ipAddress;
    }

    if (filter.referer) {
      where.referer = { contains: filter.referer, mode: "insensitive" };
    }

    if (filter.userId) {
      where.urlAnalytics = {
        is: {
          createdBy: filter.userId,
        },
      };
    }

    return where;
  }

  async add(
    analytics:
      | Prisma.AnalyticsCreateInput
      | Prisma.AnalyticsUncheckedCreateInput,
  ): Promise<Analytics> {
    return this.db.analytics.create({ data: analytics });
  }

  async batchAdd(
    analytics: Prisma.AnalyticsCreateManyInput,
  ): Promise<BatchPayload> {
    return this.db.analytics.createMany({ data: analytics });
  }

  async findById(
    id: string,
    includeUrl: boolean = false,
  ): Promise<(Analytics & { urlAnalytics?: any }) | null> {
    return this.db.analytics.findUnique({
      where: { id },
      ...(includeUrl && {
        include: {
          urlAnalytics: true,
        },
      }),
    });
  }

  async findAllByShortCode(
    shortCode: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<Analytics[] | null> {
    return this.db.analytics.findMany({
      where: {
        shortCode: shortCode,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        clickedAt: "desc",
      },
    });
  }

  async findInIntervalByShortCode(
    shortCode: string,
    startTime: Date,
    endTime?: Date,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<Analytics[] | null> {
    const start = startTime;
    const end = endTime ?? new Date();
    return this.db.analytics.findMany({
      where: {
        clickedAt: {
          gte: start,
          lte: end,
        },
        shortCode: shortCode,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        clickedAt: "desc",
      },
    });
  }

  async count(filters?: AnalyticsFilterCriteria): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.db.analytics.count({ where });
  }

  async countByShortCode(shortCode: string): Promise<number> {
    return this.db.analytics.count({
      where: { shortCode },
    });
  }

  async findMany(
    filters?: AnalyticsFilterCriteria,
    pagination?: AnalyticsPaginationOptions,
  ): Promise<Analytics[]> {
    const where = this.buildWhereClause(filters);
    const page = Math.max(1, pagination?.page ?? 1);
    const pageSize = Math.max(1, Math.min(pagination?.pageSize ?? 20, 100));
    const sortBy = pagination?.sortBy ?? "clickedAt";
    const sortOrder = pagination?.sortOrder ?? "desc";

    return this.db.analytics.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });
  }

  async findManyWithCount(
    filters?: AnalyticsFilterCriteria,
    pagination?: AnalyticsPaginationOptions,
    includeUrl: boolean = false,
  ): Promise<{ data: (Analytics & { urlAnalytics?: any })[]; total: number }> {
    const where = this.buildWhereClause(filters);
    const page = Math.max(1, pagination?.page ?? 1);
    const pageSize = Math.max(1, Math.min(pagination?.pageSize ?? 20, 100));
    const sortBy = pagination?.sortBy ?? "clickedAt";
    const sortOrder = pagination?.sortOrder ?? "desc";

    const [data, total] = await Promise.all([
      this.db.analytics.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        ...(includeUrl && {
          include: {
            urlAnalytics: true,
          },
        }),
      }),
      this.db.analytics.count({ where }),
    ]);

    return { data, total };
  }

  async getStats(
    filters?: AnalyticsFilterCriteria,
  ): Promise<AnalyticsStatsResult> {
    const where = this.buildWhereClause(filters);

    const [totalClicks, deviceGroups, countryGroups, refererGroups] =
      await Promise.all([
        this.db.analytics.count({ where }),
        this.db.analytics.groupBy({
          by: ["device"],
          where,
          _count: { _all: true },
          orderBy: {
            _count: {
              device: "desc",
            },
          },
          take: 10,
        }),
        this.db.analytics.groupBy({
          by: ["countryCode"],
          where,
          _count: { _all: true },
          orderBy: {
            _count: {
              countryCode: "desc",
            },
          },
          take: 10,
        }),
        this.db.analytics.groupBy({
          by: ["referer"],
          where,
          _count: { _all: true },
          orderBy: {
            _count: {
              referer: "desc",
            },
          },
          take: 10,
        }),
      ]);

    return {
      totalClicks,
      clicksByDevice: deviceGroups.map((g) => ({
        device: g.device,
        count: (g._count as any)?._all ?? 0,
      })),
      clicksByCountry: countryGroups.map((g) => ({
        countryCode: g.countryCode,
        count: (g._count as any)?._all ?? 0,
      })),
      clicksByReferer: refererGroups.map((g) => ({
        referer: g.referer,
        count: (g._count as any)?._all ?? 0,
      })),
    };
  }
}
