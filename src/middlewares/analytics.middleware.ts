import { NextFunction, Request, Response } from "express";
import { NewUrlAnalytics } from "../models/analytics.model";

declare global {
  namespace Express {
    interface Request {
      analytics?: NewUrlAnalytics;
    }
  }
}

function getHeaderValue(
  headers: Request["headers"],
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const value = headers[name.toLowerCase()];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    } else if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === "string") {
        const trimmed = first.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
  }
  return undefined;
}

export function extractUrlAnalytics(req: Request): NewUrlAnalytics {
  const forwardedFor = getHeaderValue(
    req.headers,
    "x-forwarded-for",
    "forwarded",
  );
  const forwardedIp = forwardedFor
    ? forwardedFor.split(",")[0]?.trim()
    : undefined;

  const ipAddress =
    forwardedIp ||
    getHeaderValue(
      req.headers,
      "x-real-ip",
      "cf-connecting-ip",
      "fastly-client-ip",
      "true-client-ip",
      "x-client-ip",
      "x-cluster-client-ip",
      "ip-address",
      "x-ip-address",
    ) ||
    req.ip ||
    req.socket?.remoteAddress ||
    "";

  const userAgent =
    getHeaderValue(req.headers, "user-agent") ??
    (typeof req.body?.user_agent === "string"
      ? req.body.user_agent
      : undefined);

  const referer =
    getHeaderValue(req.headers, "referer", "referrer") ??
    (typeof req.body?.referer === "string" ? req.body.referer : undefined);

  const device =
    getHeaderValue(
      req.headers,
      "device",
      "x-device",
      "x-device-type",
      "sec-ch-ua-platform",
      "sec-ch-ua-mobile",
    ) ?? (typeof req.body?.device === "string" ? req.body.device : undefined);

  const browser =
    getHeaderValue(req.headers, "browser", "x-browser", "sec-ch-ua") ??
    (typeof req.body?.browser === "string" ? req.body.browser : undefined);

  const countryCode =
    getHeaderValue(
      req.headers,
      "country-code",
      "x-country-code",
      "cf-ipcountry",
      "x-country",
      "country",
    ) ??
    (typeof req.body?.country_code === "string"
      ? req.body.country_code
      : undefined);

  const shortCodeParam = req.params?.short_code ?? req.params?.shortCode;
  const shortCodeQuery = req.query?.short_code ?? req.query?.shortCode;
  const shortCode =
    (typeof shortCodeParam === "string" && shortCodeParam.trim().length > 0
      ? shortCodeParam.trim()
      : undefined) ??
    (typeof shortCodeQuery === "string" && shortCodeQuery.trim().length > 0
      ? shortCodeQuery.trim()
      : undefined) ??
    getHeaderValue(req.headers, "short-code", "x-short-code") ??
    (typeof req.body?.short_code === "string" &&
    req.body.short_code.trim().length > 0
      ? req.body.short_code.trim()
      : undefined);

  const rawClickedAt =
    getHeaderValue(req.headers, "clicked-at", "x-clicked-at", "date") ??
    req.body?.clicked_at;
  let clickedAt = new Date();
  if (rawClickedAt) {
    const parsedDate = new Date(rawClickedAt);
    if (!Number.isNaN(parsedDate.getTime())) {
      clickedAt = parsedDate;
    }
  }

  return {
    device,
    browser,
    referer,
    short_code: shortCode,
    clicked_at: clickedAt,
    ip_address: ipAddress,
    user_agent: userAgent,
    country_code: countryCode,
  };
}

export function analyticsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const analytics = extractUrlAnalytics(req);
  req.analytics = analytics;
  res.locals.analytics = analytics;
  next();
}

export default analyticsMiddleware;
