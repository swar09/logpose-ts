import { ObjectId } from "mongodb";
import {
  getRawClicksCollection,
  getUrlMetricsCollection,
} from "../lib/mongodb";
import {
  RawClickDocument,
  UrlMetricsDocument,
} from "../models/analytics.mongo";

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

export interface MetricsFilterCriteria {
  shortCode?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface UrlMetricsSummary {
  totalClicks: number;
  devices: Record<string, number>;
  countries: Record<string, number>;
  browsers: Record<string, number>;
  referers: Record<string, number>;
}

export interface UrlMetricsResult {
  data: UrlMetricsDocument[];
  total: number;
  summary: UrlMetricsSummary;
}

export class AnalyticsRepository {
  private buildMongoQuery(filter?: AnalyticsFilterCriteria): Record<string, any> {
    if (!filter) return {};
    const query: Record<string, any> = {};

    if (filter.id) {
      try {
        query._id = new ObjectId(filter.id);
      } catch {
        query._id = filter.id;
      }
    }

    if (filter.shortCode) {
      if (Array.isArray(filter.shortCode)) {
        query.shortCode = { $in: filter.shortCode };
      } else {
        query.shortCode = filter.shortCode;
      }
    }

    if (filter.userId) {
      query.userId = filter.userId;
    }

    if (filter.countryCode) {
      query.countryCode = { $regex: new RegExp(`^${filter.countryCode}$`, "i") };
    }

    if (filter.device) {
      query.device = filter.device.toLowerCase();
    }

    if (filter.ipAddress) {
      query.ipAddress = filter.ipAddress;
    }

    if (filter.referer) {
      query.referer = { $regex: new RegExp(filter.referer, "i") };
    }

    if (filter.startTime || filter.endTime) {
      query.clickedAt = {};
      if (filter.startTime) {
        query.clickedAt.$gte = filter.startTime;
      }
      if (filter.endTime) {
        query.clickedAt.$lte = filter.endTime;
      }
    }

    return query;
  }

  private mapDocument(doc: any) {
    return {
      id: doc._id?.toString() || "",
      shortCode: doc.shortCode,
      userId: doc.userId,
      clickedAt: doc.clickedAt instanceof Date ? doc.clickedAt : new Date(doc.clickedAt),
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      device: doc.device,
      browser: doc.browser,
      countryCode: doc.countryCode,
      referer: doc.referer,
    };
  }

  async add(analytics: any): Promise<any> {
    const rawClicksCol = await getRawClicksCollection();
    const doc: RawClickDocument = {
      shortCode: analytics.shortCode,
      userId: analytics.userId,
      clickedAt: analytics.clickedAt ? new Date(analytics.clickedAt) : new Date(),
      ipAddress: analytics.ipAddress || "unknown",
      userAgent: analytics.userAgent || "unknown",
      device: analytics.device || "unknown",
      browser: analytics.browser || "unknown",
      countryCode: analytics.countryCode || "unknown",
      referer: analytics.referer || "direct",
      ingestedAt: new Date(),
    };
    const result = await rawClicksCol.insertOne(doc);
    return { ...doc, id: result.insertedId.toString() };
  }

  async batchAdd(items: any[]): Promise<{ count: number }> {
    if (!items || items.length === 0) return { count: 0 };
    const rawClicksCol = await getRawClicksCollection();
    const docs: RawClickDocument[] = items.map((analytics) => ({
      shortCode: analytics.shortCode,
      userId: analytics.userId,
      clickedAt: analytics.clickedAt ? new Date(analytics.clickedAt) : new Date(),
      ipAddress: analytics.ipAddress || "unknown",
      userAgent: analytics.userAgent || "unknown",
      device: analytics.device || "unknown",
      browser: analytics.browser || "unknown",
      countryCode: analytics.countryCode || "unknown",
      referer: analytics.referer || "direct",
      ingestedAt: new Date(),
    }));
    const result = await rawClicksCol.insertMany(docs, { ordered: false });
    return { count: result.insertedCount };
  }

  async findById(id: string, _includeUrl = false): Promise<any | null> {
    const rawClicksCol = await getRawClicksCollection();
    let query: Record<string, any>;
    try {
      query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
    } catch {
      query = { _id: id };
    }

    const doc = await rawClicksCol.findOne(query as any);
    if (!doc) return null;
    return this.mapDocument(doc);
  }

  async findManyWithCount(
    filters?: AnalyticsFilterCriteria,
    pagination?: AnalyticsPaginationOptions,
    _includeUrl = false,
  ): Promise<{ data: any[]; total: number }> {
    const rawClicksCol = await getRawClicksCollection();
    const query = this.buildMongoQuery(filters);

    const page = Math.max(1, pagination?.page ?? 1);
    const pageSize = Math.max(1, Math.min(pagination?.pageSize ?? 20, 100));
    const sortBy = pagination?.sortBy ?? "clickedAt";
    const sortOrder = pagination?.sortOrder === "asc" ? 1 : -1;

    const [docs, total] = await Promise.all([
      rawClicksCol
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      rawClicksCol.countDocuments(query),
    ]);

    return {
      data: docs.map((doc) => this.mapDocument(doc)),
      total,
    };
  }

  async findMany(
    filters?: AnalyticsFilterCriteria,
    pagination?: AnalyticsPaginationOptions,
  ): Promise<any[]> {
    const result = await this.findManyWithCount(filters, pagination);
    return result.data;
  }

  async findAllByShortCode(
    shortCode: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<any[] | null> {
    const rawClicksCol = await getRawClicksCollection();
    const docs = await rawClicksCol
      .find({ shortCode })
      .sort({ clickedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    return docs.map((doc) => this.mapDocument(doc));
  }

  async findInIntervalByShortCode(
    shortCode: string,
    startTime: Date,
    endTime?: Date,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<any[] | null> {
    const rawClicksCol = await getRawClicksCollection();
    const docs = await rawClicksCol
      .find({
        shortCode,
        clickedAt: {
          $gte: startTime,
          $lte: endTime || new Date(),
        },
      })
      .sort({ clickedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    return docs.map((doc) => this.mapDocument(doc));
  }

  async count(filters?: AnalyticsFilterCriteria): Promise<number> {
    const rawClicksCol = await getRawClicksCollection();
    const query = this.buildMongoQuery(filters);
    return rawClicksCol.countDocuments(query);
  }

  async countByShortCode(shortCode: string): Promise<number> {
    return this.count({ shortCode });
  }

  async getStats(filters?: AnalyticsFilterCriteria): Promise<AnalyticsStatsResult> {
    const rawClicksCol = await getRawClicksCollection();
    const match = this.buildMongoQuery(filters);

    const [aggregation] = await rawClicksCol
      .aggregate([
        { $match: match },
        {
          $facet: {
            totalClicks: [{ $count: "count" }],
            clicksByDevice: [
              { $group: { _id: "$device", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 },
              { $project: { _id: 0, device: "$_id", count: 1 } },
            ],
            clicksByCountry: [
              { $group: { _id: "$countryCode", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 },
              { $project: { _id: 0, countryCode: "$_id", count: 1 } },
            ],
            clicksByReferer: [
              { $group: { _id: "$referer", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 },
              { $project: { _id: 0, referer: "$_id", count: 1 } },
            ],
          },
        },
      ])
      .toArray();

    return {
      totalClicks: aggregation?.totalClicks?.[0]?.count ?? 0,
      clicksByDevice: aggregation?.clicksByDevice ?? [],
      clicksByCountry: aggregation?.clicksByCountry ?? [],
      clicksByReferer: aggregation?.clicksByReferer ?? [],
    };
  }

  async getMetrics(
    filter: MetricsFilterCriteria,
    pagination?: { page?: number; pageSize?: number },
  ): Promise<UrlMetricsResult> {
    const urlMetricsCol = await getUrlMetricsCollection();
    const query: Record<string, any> = {};

    if (filter.shortCode) {
      query.shortCode = filter.shortCode;
    }
    if (filter.userId) {
      query.userId = filter.userId;
    }
    if (filter.fromDate || filter.toDate) {
      query.date = {};
      if (filter.fromDate) query.date.$gte = filter.fromDate;
      if (filter.toDate) query.date.$lte = filter.toDate;
    }

    const page = Math.max(1, pagination?.page ?? 1);
    const pageSize = Math.max(1, Math.min(pagination?.pageSize ?? 30, 100));

    const [docs, total] = await Promise.all([
      urlMetricsCol
        .find(query)
        .sort({ date: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      urlMetricsCol.countDocuments(query),
    ]);

    const summary: UrlMetricsSummary = {
      totalClicks: 0,
      devices: {},
      countries: {},
      browsers: {},
      referers: {},
    };

    for (const doc of docs) {
      summary.totalClicks += doc.totalClicks || 0;
      for (const [k, v] of Object.entries(doc.devices || {})) {
        summary.devices[k] = (summary.devices[k] || 0) + v;
      }
      for (const [k, v] of Object.entries(doc.countries || {})) {
        summary.countries[k] = (summary.countries[k] || 0) + v;
      }
      for (const [k, v] of Object.entries(doc.browsers || {})) {
        summary.browsers[k] = (summary.browsers[k] || 0) + v;
      }
      for (const [k, v] of Object.entries(doc.referers || {})) {
        summary.referers[k] = (summary.referers[k] || 0) + v;
      }
    }

    return {
      data: docs,
      total,
      summary,
    };
  }
}

export const analyticsRepo = new AnalyticsRepository();
