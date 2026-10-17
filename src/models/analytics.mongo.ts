import { z } from "zod";

export const ClickEventPayloadSchema = z.object({
  shortCode: z.string().min(1, "shortCode is required").max(50),
  userId: z.string().optional(),
  clickedAt: z.coerce.date().default(() => new Date()),
  ipAddress: z.string().default("unknown"),
  userAgent: z.string().default("unknown"),
  device: z
    .preprocess((val) => {
      if (!val || typeof val !== "string") return "unknown";
      const lower = val.toLowerCase();
      if (["desktop", "mobile", "tablet", "bot", "unknown"].includes(lower)) return lower;
      if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) return "mobile";
      if (lower.includes("tablet") || lower.includes("ipad")) return "tablet";
      if (lower.includes("bot") || lower.includes("crawl") || lower.includes("spider")) return "bot";
      return "desktop";
    }, z.enum(["desktop", "mobile", "tablet", "bot", "unknown"]))
    .default("unknown"),
  browser: z.string().default("unknown"),
  countryCode: z.string().max(10).default("unknown"),
  referer: z.string().max(2048).default("direct"),
});

export type ValidatedClickEvent = z.infer<typeof ClickEventPayloadSchema>;

export interface RawClickDocument {
  _id?: string;
  shortCode: string;
  userId?: string;
  clickedAt: Date;
  ipAddress: string;
  userAgent: string;
  device: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  browser: string;
  countryCode: string;
  referer: string;
  ingestedAt: Date;
}

export interface UrlMetricsDocument {
  _id: string;
  shortCode: string;
  date: string;
  userId?: string;
  totalClicks: number;
  devices: Record<string, number>;
  countries: Record<string, number>;
  browsers: Record<string, number>;
  referers: Record<string, number>;
  updatedAt: Date;
}

export type DeadLetterReason =
  | "MALFORMED_JSON"
  | "SCHEMA_VALIDATION_FAILED"
  | "DB_WRITE_ERROR"
  | "UNKNOWN_ERROR";

export interface DeadLetterDocument {
  _id?: string;
  originalPayload: unknown;
  errorReason: DeadLetterReason;
  errorDetails: unknown;
  failedAt: Date;
  sourceTopic: string;
  status: "UNRESOLVED" | "REPROCESSED" | "IGNORED";
  retryCount?: number;
  reprocessedAt?: Date;
}
