import { describe, it, expect, vi } from "vitest";
import {
  analyticsMiddleware,
  extractUrlAnalytics,
} from "../../src/middlewares/analytics.middleware";

describe("analyticsMiddleware", () => {
  it("should extract analytics from headers and attach to req.analytics and res.locals.analytics", () => {
    const req: any = {
      headers: {
        "x-forwarded-for": "203.0.113.195, 70.41.3.18",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        referer: "https://google.com",
        "x-device": "desktop",
        "x-browser": "Chrome",
        "x-country-code": "US",
      },
      params: {
        short_code: "xyz123",
      },
      query: {},
      body: {},
    };
    const res: any = { locals: {} };
    const next = vi.fn();

    analyticsMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.analytics).toBeDefined();
    expect(req.analytics.ip_address).toBe("203.0.113.195");
    expect(req.analytics.user_agent).toBe(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    );
    expect(req.analytics.referer).toBe("https://google.com");
    expect(req.analytics.device).toBe("desktop");
    expect(req.analytics.browser).toBe("Chrome");
    expect(req.analytics.country_code).toBe("US");
    expect(req.analytics.short_code).toBe("xyz123");
    expect(req.analytics.clicked_at).toBeInstanceOf(Date);
    expect(res.locals.analytics).toEqual(req.analytics);
  });

  it("should extract short_code from query params if not in route params", () => {
    const req: any = {
      headers: {
        "x-real-ip": "198.51.100.1",
      },
      params: {},
      query: {
        short_code: "abc456",
      },
      body: {},
    };

    const analytics = extractUrlAnalytics(req);
    expect(analytics.short_code).toBe("abc456");
    expect(analytics.ip_address).toBe("198.51.100.1");
  });

  it("should fallback to req.ip or socket.remoteAddress if proxy headers are missing", () => {
    const req: any = {
      headers: {},
      ip: "127.0.0.1",
      params: {},
      query: {},
      body: {},
    };

    const analytics = extractUrlAnalytics(req);
    expect(analytics.ip_address).toBe("127.0.0.1");
  });

  it("should parse custom clicked-at timestamp from headers if provided", () => {
    const timestamp = "2026-10-15T10:00:00.000Z";
    const req: any = {
      headers: {
        "clicked-at": timestamp,
      },
      params: {},
      query: {},
      body: {},
    };

    const analytics = extractUrlAnalytics(req);
    expect(analytics.clicked_at.toISOString()).toBe(timestamp);
  });
});
