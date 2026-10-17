import { BillingRepository } from "../../../src/repositories/billing.repository";

export interface ReconcileResult {
  foundCount: number;
  expiredCount: number;
  expiredSubscriptions: {
    id: string;
    userId: string;
    currentPeriodEnd: Date;
    previousStatus: string;
  }[];
  durationMs: number;
}

export class SubscriptionReconciler {
  private billingRepo: BillingRepository;
  private intervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private totalExpiredCount = 0;
  private lastReconciledAt: Date | null = null;
  private lastRunDurationMs = 0;

  constructor(billingRepo: BillingRepository, intervalMs = 60000) {
    this.billingRepo = billingRepo;
    this.intervalMs = intervalMs;
  }

  async reconcileOnce(now: Date = new Date()): Promise<ReconcileResult> {
    const startTime = Date.now();
    const expiredSubs = await this.billingRepo.findExpiredSubscriptions(now);

    if (expiredSubs.length === 0) {
      const durationMs = Date.now() - startTime;
      this.lastReconciledAt = new Date();
      this.lastRunDurationMs = durationMs;
      return {
        foundCount: 0,
        expiredCount: 0,
        expiredSubscriptions: [],
        durationMs,
      };
    }

    const ids = expiredSubs.map((sub) => sub.id);
    const updatedCount = await this.billingRepo.expireSubscriptionsByIds(ids);

    this.totalExpiredCount += updatedCount;
    this.lastReconciledAt = new Date();
    this.lastRunDurationMs = Date.now() - startTime;

    return {
      foundCount: expiredSubs.length,
      expiredCount: updatedCount,
      expiredSubscriptions: expiredSubs.map((sub) => ({
        id: sub.id,
        userId: sub.userId,
        currentPeriodEnd: sub.currentPeriodEnd,
        previousStatus: sub.status,
      })),
      durationMs: this.lastRunDurationMs,
    };
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        await this.reconcileOnce();
      } catch (err) {
        console.error("[Subscription Reconciler] Error during reconciliation:", err);
      } finally {
        this.isProcessing = false;
      }
    }, this.intervalMs);
    console.log(`[Subscription Reconciler] Worker started. Interval: ${this.intervalMs}ms`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log("[Subscription Reconciler] Worker stopped.");
  }

  getMetrics() {
    return {
      totalExpiredCount: this.totalExpiredCount,
      lastReconciledAt: this.lastReconciledAt,
      lastRunDurationMs: this.lastRunDurationMs,
      intervalMs: this.intervalMs,
      isRunning: this.timer !== null,
    };
  }
}
