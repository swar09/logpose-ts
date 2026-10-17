import crypto from "node:crypto";

export interface UrlClickEventPayload {
  shortCode: string;
  userId?: string;
  clickedAt: string;
  ipAddress: string;
  userAgent: string;
  device: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  browser?: string;
  countryCode: string;
  referer: string;
}

export interface UrlClickEventEnvelope {
  eventId: string;
  version: "1.0";
  source: "logpose-api";
  timestamp: string;
  payload: UrlClickEventPayload;
}

function normalizeDevice(val?: string): "desktop" | "mobile" | "tablet" | "bot" | "unknown" {
  if (!val) return "unknown";
  const lower = val.toLowerCase();
  if (["desktop", "mobile", "tablet", "bot", "unknown"].includes(lower)) {
    return lower as any;
  }
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) {
    return "mobile";
  }
  if (lower.includes("tablet") || lower.includes("ipad")) {
    return "tablet";
  }
  if (lower.includes("bot") || lower.includes("crawl") || lower.includes("spider")) {
    return "bot";
  }
  if (lower.includes("win") || lower.includes("mac") || lower.includes("linux")) {
    return "desktop";
  }
  return "unknown";
}

export function sanitizeClickPayload(raw: {
  shortCode: string;
  userId?: string;
  clickedAt?: Date | string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  countryCode?: string;
  referer?: string;
}): UrlClickEventPayload {
  const parsedDate =
    raw.clickedAt instanceof Date
      ? raw.clickedAt
      : typeof raw.clickedAt === "string" && !Number.isNaN(Date.parse(raw.clickedAt))
        ? new Date(raw.clickedAt)
        : new Date();

  return {
    shortCode: String(raw.shortCode || "").slice(0, 50),
    userId: raw.userId ? String(raw.userId).replace(/\0/g, "").slice(0, 100) : undefined,
    clickedAt: parsedDate.toISOString(),
    ipAddress: String(raw.ipAddress || "unknown").replace(/\0/g, "").slice(0, 45),
    userAgent: String(raw.userAgent || "unknown").replace(/\0/g, "").slice(0, 512),
    device: normalizeDevice(raw.device),
    browser: raw.browser
      ? String(raw.browser).replace(/\0/g, "").slice(0, 50)
      : undefined,
    countryCode: String(raw.countryCode || "unknown")
      .replace(/\0/g, "")
      .slice(0, 10),
    referer: String(raw.referer || "direct").replace(/\0/g, "").slice(0, 2048),
  };
}

export function createUrlClickEnvelope(
  payload: UrlClickEventPayload,
): UrlClickEventEnvelope {
  return {
    eventId: crypto.randomUUID(),
    version: "1.0",
    source: "logpose-api",
    timestamp: new Date().toISOString(),
    payload,
  };
}
