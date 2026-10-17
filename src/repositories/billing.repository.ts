import {
  PaymentStatus,
  SubscriptionStatus,
  Payments,
  Plans,
  Prisma,
  UserSubscriptions,
  PrismaClient,
} from "../generated/prisma/client";

export class BillingRepository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
  }

  async getActivePlans(): Promise<Plans[]> {
    return this.db.plans.findMany({
      where: { is_active: true },
    });
  }

  async getPlanById(id: number): Promise<Plans | null> {
    return this.db.plans.findUnique({
      where: { id },
    });
  }

  async getPlanByCode(code: string): Promise<Plans | null> {
    return this.db.plans.findUnique({
      where: { code },
    });
  }

  async createPayment(
    data: Prisma.PaymentsCreateInput | Prisma.PaymentsUncheckedCreateInput,
  ): Promise<Payments> {
    return this.db.payments.create({
      data,
    });
  }

  async getPaymentByOrderId(razorpayOrderID: string): Promise<Payments | null> {
    return this.db.payments.findFirst({
      where: { razorpayOrderID },
    });
  }

  async getPaymentsByUserId(userId: string): Promise<Payments[]> {
    return this.db.payments.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    details?: {
      errorCode?: string | null;
      errorDescription?: string | null;
      razorpayPaymentID?: string;
      razorpaySignature?: string;
    },
  ): Promise<Payments> {
    return this.db.payments.update({
      where: { id },
      data: {
        status,
        ...details,
      },
    });
  }

  async createUserSubscription(
    data:
      | Prisma.UserSubscriptionsCreateInput
      | Prisma.UserSubscriptionsUncheckedCreateInput,
  ): Promise<UserSubscriptions> {
    return this.db.userSubscriptions.create({
      data,
    });
  }

  async getSubscriptionByUserId(
    userId: string,
  ): Promise<UserSubscriptions | null> {
    return this.db.userSubscriptions.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSubscriptionsByUserId(userId: string): Promise<UserSubscriptions[]> {
    return this.db.userSubscriptions.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSubscriptionByRazorpayCustomerId(
    customerId: string,
  ): Promise<UserSubscriptions | null> {
    return this.db.userSubscriptions.findFirst({
      where: { razorpayCustomerID: customerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSubscriptionByRazorpaySubscriptionId(
    subscriptionId: string,
  ): Promise<UserSubscriptions | null> {
    return this.db.userSubscriptions.findFirst({
      where: { razorpaySubscriptionID: subscriptionId },
    });
  }

  async updateSubscriptionStatus(
    id: string,
    status: SubscriptionStatus,
  ): Promise<UserSubscriptions> {
    return this.db.userSubscriptions.update({
      where: { id },
      data: { status },
    });
  }

  async cancelSubscription(id: string): Promise<UserSubscriptions> {
    return this.updateSubscriptionStatus(id, SubscriptionStatus.INACTIVE);
  }

  async findExpiredSubscriptions(
    now: Date = new Date(),
    limit?: number,
  ): Promise<UserSubscriptions[]> {
    return this.db.userSubscriptions.findMany({
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
      ...(limit ? { take: limit } : {}),
    });
  }

  async expireSubscriptionsByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.db.userSubscriptions.updateMany({
      where: {
        id: { in: ids },
        status: { not: SubscriptionStatus.INACTIVE },
      },
      data: {
        status: SubscriptionStatus.INACTIVE,
      },
    });
    return result.count;
  }

  async updateSubscription(
    id: string,
    data:
      | Prisma.UserSubscriptionsUpdateInput
      | Prisma.UserSubscriptionsUncheckedUpdateInput,
  ): Promise<UserSubscriptions> {
    return this.db.userSubscriptions.update({
      where: { id },
      data,
    });
  }

  async recordWebhookEvent(
    eventId: string,
    eventType: string,
    payload: string[] = [],
  ) {
    return this.db.webhookEvents.create({
      data: {
        eventId,
        eventType,
        payload,
      },
    });
  }

  async getWebhookEventByEventId(eventId: string) {
    return this.db.webhookEvents.findFirst({
      where: { eventId },
    });
  }

  async markWebhookProcessed(
    id: string,
    status: "COMPLETED" | "FAILED",
    errorLog?: string,
  ) {
    return this.db.webhookEvents.update({
      where: { id },
      data: {
        status,
        errorLog,
      },
    });
  }
}
