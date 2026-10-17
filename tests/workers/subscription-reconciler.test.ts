import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { SubscriptionReconciler } from "../../workers/subscription-reconciler/src/services/subscription-reconciler";
import { createOpsServer } from "../../workers/subscription-reconciler/src/server";
import { BillingRepository } from "../../src/repositories/billing.repository";
import { SubscriptionStatus } from "../../src/generated/prisma/client";

describe("SubscriptionReconciler & Expiration Pipeline", () => {
  let mockDb: any;
  let billingRepo: BillingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockDb = {
      userSubscriptions: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      $queryRawUnsafe: vi.fn(),
    };

    billingRepo = new BillingRepository(mockDb as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("BillingRepository.findExpiredSubscriptions", () => {
    it("should query for subscriptions with currentPeriodEnd < now and active statuses", async () => {
      const now = new Date("2026-10-17T12:00:00Z");
      const pastDate = new Date("2026-10-17T10:00:00Z");
      const mockExpired = [
        {
          id: "sub-1",
          userId: "user-1",
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: pastDate,
          userSubscription: { id: "user-1", email: "user1@example.com" },
        },
      ];

      mockDb.userSubscriptions.findMany.mockResolvedValue(mockExpired);

      const result = await billingRepo.findExpiredSubscriptions(now);

      expect(result).toEqual(mockExpired);
      expect(mockDb.userSubscriptions.findMany).toHaveBeenCalledWith({
        where: {
          currentPeriodEnd: { lt: now },
          status: {
            in: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.CREATED,
              SubscriptionStatus.HOLD,
            ],
          },
        },
        include: {
          userSubscription: true,
        },
        orderBy: { currentPeriodEnd: "asc" },
      });
    });

    it("should respect optional limit parameter when supplied", async () => {
      const now = new Date();
      mockDb.userSubscriptions.findMany.mockResolvedValue([]);

      await billingRepo.findExpiredSubscriptions(now, 50);

      expect(mockDb.userSubscriptions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe("BillingRepository.expireSubscriptionsByIds", () => {
    it("should return 0 immediately if ids array is empty", async () => {
      const count = await billingRepo.expireSubscriptionsByIds([]);
      expect(count).toBe(0);
      expect(mockDb.userSubscriptions.updateMany).not.toHaveBeenCalled();
    });

    it("should update matching subscriptions to INACTIVE status", async () => {
      mockDb.userSubscriptions.updateMany.mockResolvedValue({ count: 3 });

      const count = await billingRepo.expireSubscriptionsByIds(["sub-1", "sub-2", "sub-3"]);

      expect(count).toBe(3);
      expect(mockDb.userSubscriptions.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["sub-1", "sub-2", "sub-3"] },
          status: { not: SubscriptionStatus.INACTIVE },
        },
        data: {
          status: SubscriptionStatus.INACTIVE,
        },
      });
    });
  });

  describe("SubscriptionReconciler.reconcileOnce", () => {
    it("should select expired subscriptions and update them to INACTIVE", async () => {
      const now = new Date("2026-10-17T15:00:00Z");
      const expiredSubs = [
        {
          id: "sub-101",
          userId: "user-101",
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date("2026-10-17T14:00:00Z"),
        },
        {
          id: "sub-102",
          userId: "user-102",
          status: SubscriptionStatus.HOLD,
          currentPeriodEnd: new Date("2026-10-17T13:00:00Z"),
        },
      ];

      mockDb.userSubscriptions.findMany.mockResolvedValue(expiredSubs);
      mockDb.userSubscriptions.updateMany.mockResolvedValue({ count: 2 });

      const reconciler = new SubscriptionReconciler(billingRepo, 5000);
      const result = await reconciler.reconcileOnce(now);

      expect(result.foundCount).toBe(2);
      expect(result.expiredCount).toBe(2);
      expect(result.expiredSubscriptions).toHaveLength(2);
      expect(result.expiredSubscriptions[0].id).toBe("sub-101");
      expect(result.expiredSubscriptions[1].id).toBe("sub-102");

      const metrics = reconciler.getMetrics();
      expect(metrics.totalExpiredCount).toBe(2);
      expect(metrics.lastReconciledAt).toBeInstanceOf(Date);
    });

    it("should return zero counts when no subscriptions are past currentPeriodEnd", async () => {
      mockDb.userSubscriptions.findMany.mockResolvedValue([]);

      const reconciler = new SubscriptionReconciler(billingRepo, 5000);
      const result = await reconciler.reconcileOnce();

      expect(result.foundCount).toBe(0);
      expect(result.expiredCount).toBe(0);
      expect(result.expiredSubscriptions).toEqual([]);
      expect(mockDb.userSubscriptions.updateMany).not.toHaveBeenCalled();
    });

    it("should manage timer lifecycle through start and stop", () => {
      vi.useFakeTimers();
      const reconciler = new SubscriptionReconciler(billingRepo, 1000);

      reconciler.start();
      expect(reconciler.getMetrics().isRunning).toBe(true);

      reconciler.start();
      expect(reconciler.getMetrics().isRunning).toBe(true);

      reconciler.stop();
      expect(reconciler.getMetrics().isRunning).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("Ops Server Endpoints", () => {
    it("GET /healthz should return 200 with service metrics", async () => {
      const reconciler = new SubscriptionReconciler(billingRepo, 10000);
      const { app } = createOpsServer(reconciler, mockDb as any);

      const response = await request(app).get("/healthz");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.service).toBe("subscription-reconciler");
      expect(response.body.totalExpiredCount).toBe(0);
    });

    it("GET /ready should return 200 when database connectivity succeeds", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);
      const reconciler = new SubscriptionReconciler(billingRepo, 10000);
      const { app } = createOpsServer(reconciler, mockDb as any);

      const response = await request(app).get("/ready");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ready");
      expect(response.body.database).toBe("connected");
    });

    it("GET /ready should return 503 when database connectivity fails", async () => {
      mockDb.$queryRawUnsafe.mockRejectedValue(new Error("Connection refused"));
      const reconciler = new SubscriptionReconciler(billingRepo, 10000);
      const { app } = createOpsServer(reconciler, mockDb as any);

      const response = await request(app).get("/ready");

      expect(response.status).toBe(503);
      expect(response.body.status).toBe("unready");
      expect(response.body.database).toBe("disconnected");
    });

    it("GET /metrics should return reconciler metrics object", async () => {
      const reconciler = new SubscriptionReconciler(billingRepo, 10000);
      const { app } = createOpsServer(reconciler, mockDb as any);

      const response = await request(app).get("/metrics");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalExpiredCount");
      expect(response.body).toHaveProperty("intervalMs", 10000);
    });

    it("POST /reconcile should trigger manual reconciliation and return summary", async () => {
      mockDb.userSubscriptions.findMany.mockResolvedValue([]);
      const reconciler = new SubscriptionReconciler(billingRepo, 10000);
      const { app } = createOpsServer(reconciler, mockDb as any);

      const response = await request(app).post("/reconcile");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.result.foundCount).toBe(0);
    });

    it("POST /reconcile should handle internal error with 500 status", async () => {
      mockDb.userSubscriptions.findMany.mockRejectedValue(new Error("Database error"));
      const reconciler = new SubscriptionReconciler(billingRepo, 10000);
      const { app } = createOpsServer(reconciler, mockDb as any);

      const response = await request(app).post("/reconcile");

      expect(response.status).toBe(500);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Database error");
    });
  });
});
