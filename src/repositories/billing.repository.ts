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
}
