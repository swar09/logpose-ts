import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createUrlClickEnvelope,
  sanitizeClickPayload,
} from "../../src/contracts/events/url-click.event";
import { KafkaProducerService } from "../../src/services/kafka-producer.service";

describe("Kafka Analytics Event Contract", () => {
  it("sanitizes null bytes and bounds string lengths", () => {
    const raw = {
      shortCode: "code123",
      clickedAt: "2026-10-17T12:00:00.000Z",
      ipAddress: "192.168.1.1\0malicious",
      userAgent: "Mozilla/5.0 \0 Bot".repeat(100),
      countryCode: "US\0X",
      referer: "https://example.com/\0path".repeat(200),
    };

    const sanitized = sanitizeClickPayload(raw);

    expect(sanitized.shortCode).toBe("code123");
    expect(sanitized.ipAddress).toBe("192.168.1.1malicious");
    expect(sanitized.ipAddress).not.toContain("\0");
    expect(sanitized.userAgent).not.toContain("\0");
    expect(sanitized.userAgent.length).toBeLessThanOrEqual(512);
    expect(sanitized.countryCode).toBe("USX");
    expect(sanitized.referer).not.toContain("\0");
    expect(sanitized.referer.length).toBeLessThanOrEqual(2048);
  });

  it("handles missing or invalid date by defaulting to a valid ISO string", () => {
    const raw = {
      shortCode: "abc",
      clickedAt: "invalid-date",
    };

    const sanitized = sanitizeClickPayload(raw);
    expect(sanitized.clickedAt).toBeDefined();
    expect(Number.isNaN(Date.parse(sanitized.clickedAt))).toBe(false);
  });

  it("creates a compliant event envelope", () => {
    const sanitized = sanitizeClickPayload({ shortCode: "xyz" });
    const envelope = createUrlClickEnvelope(sanitized);

    expect(envelope.version).toBe("1.0");
    expect(envelope.source).toBe("logpose-api");
    expect(envelope.eventId).toBeDefined();
    expect(envelope.timestamp).toBeDefined();
    expect(envelope.payload.shortCode).toBe("xyz");
  });
});

describe("KafkaProducerService", () => {
  let service: KafkaProducerService;

  beforeEach(() => {
    service = new KafkaProducerService();
  });

  it("reports initial status accurately", () => {
    const status = service.getStatus();
    expect(status.isConnected).toBe(false);
    expect(status.brokers).toBeDefined();
    expect(status.topic).toBeDefined();
  });

  it("executes fire-and-forget without throwing errors", () => {
    expect(() => {
      service.publishClickFireAndForget({
        shortCode: "testCode",
        ipAddress: "127.0.0.1",
      });
    }).not.toThrow();
  });
});
