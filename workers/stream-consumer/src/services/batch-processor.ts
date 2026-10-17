import {
  getRawClicksCollection,
  getUrlMetricsCollection,
} from "../../../../src/lib/mongodb";
import {
  ValidatedClickEvent,
  RawClickDocument,
} from "../../../../src/models/analytics.mongo";
import { kafkaConfig } from "../../../../src/config";
import { routeToDlq } from "./dlq.service";

interface MetricAggregation {
  shortCode: string;
  date: string;
  userId?: string;
  count: number;
  devices: Record<string, number>;
  countries: Record<string, number>;
  browsers: Record<string, number>;
  referers: Record<string, number>;
}

export class BatchProcessor {
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly buffer: ValidatedClickEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private totalProcessed = 0;
  private lastFlushAt: Date | null = null;

  constructor(
    batchSize = kafkaConfig.batchSize || 500,
    flushIntervalMs = kafkaConfig.flushIntervalMs || 2000,
  ) {
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
  }

  start(): void {
    this.flushTimer = setInterval(async () => {
      if (this.buffer.length > 0) {
        await this.flush();
      }
    }, this.flushIntervalMs);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async push(event: ValidatedClickEvent): Promise<void> {
    this.buffer.push(event);
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  getTotalProcessed(): number {
    return this.totalProcessed;
  }

  getLastFlushAt(): Date | null {
    return this.lastFlushAt;
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    const itemsToFlush = this.buffer.splice(0, this.buffer.length);

    try {
      const rawClicksCol = await getRawClicksCollection();
      const urlMetricsCol = await getUrlMetricsCollection();

      const rawDocuments: RawClickDocument[] = itemsToFlush.map((event) => ({
        shortCode: event.shortCode,
        userId: event.userId,
        clickedAt: event.clickedAt,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        device: event.device,
        browser: event.browser,
        countryCode: event.countryCode,
        referer: event.referer,
        ingestedAt: new Date(),
      }));

      await rawClicksCol.insertMany(rawDocuments, { ordered: false });

      const aggregations = new Map<string, MetricAggregation>();

      for (const event of itemsToFlush) {
        const dateStr = event.clickedAt.toISOString().slice(0, 10);
        const compositeKey = `${event.shortCode}:${dateStr}`;

        let agg = aggregations.get(compositeKey);
        if (!agg) {
          agg = {
            shortCode: event.shortCode,
            date: dateStr,
            userId: event.userId,
            count: 0,
            devices: {},
            countries: {},
            browsers: {},
            referers: {},
          };
          aggregations.set(compositeKey, agg);
        }

        agg.count++;
        agg.devices[event.device] = (agg.devices[event.device] || 0) + 1;
        agg.countries[event.countryCode] =
          (agg.countries[event.countryCode] || 0) + 1;
        agg.browsers[event.browser] = (agg.browsers[event.browser] || 0) + 1;

        const sanitizedReferer = (event.referer || "direct").replace(/\./g, "_");
        agg.referers[sanitizedReferer] =
          (agg.referers[sanitizedReferer] || 0) + 1;
      }

      const bulkOps = Array.from(aggregations.entries()).map(([key, agg]) => {
        const incFields: Record<string, number> = {
          totalClicks: agg.count,
        };

        for (const [device, count] of Object.entries(agg.devices)) {
          incFields[`devices.${device}`] = count;
        }
        for (const [country, count] of Object.entries(agg.countries)) {
          incFields[`countries.${country}`] = count;
        }
        for (const [browser, count] of Object.entries(agg.browsers)) {
          incFields[`browsers.${browser}`] = count;
        }
        for (const [referer, count] of Object.entries(agg.referers)) {
          incFields[`referers.${referer}`] = count;
        }

        return {
          updateOne: {
            filter: { _id: key },
            update: {
              $setOnInsert: {
                shortCode: agg.shortCode,
                date: agg.date,
                ...(agg.userId && { userId: agg.userId }),
              },
              $inc: incFields,
              $set: { updatedAt: new Date() },
            },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        await urlMetricsCol.bulkWrite(bulkOps, { ordered: false });
      }

      this.totalProcessed += itemsToFlush.length;
      this.lastFlushAt = new Date();
      console.log(
        `[Batch Processor] Flushed ${itemsToFlush.length} clicks across ${aggregations.size} metric rollups.`,
      );
    } catch (error) {
      console.error("[Batch Processor Error] Batch insertion failed:", error);

      for (const item of itemsToFlush) {
        await routeToDlq(
          item,
          "DB_WRITE_ERROR",
          error instanceof Error ? error.stack : String(error),
        );
      }
    } finally {
      this.isFlushing = false;
    }
  }
}
