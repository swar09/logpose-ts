import { razorpayConfig } from "../config";
import { AppError } from "../errors/app-error";

export interface RazorpayOrderOptions {
  amount: number;
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpaySubscriptionOptions {
  planId: string;
  totalCount: number;
  quantity?: number;
  customerNotify?: 0 | 1;
  notes?: Record<string, string>;
}

export class RazorpayService {
  private get authHeader(): string {
    if (!razorpayConfig.keyId || !razorpayConfig.keySecret) {
      throw new AppError(
        "Razorpay credentials are not configured in environment variables",
        500,
      );
    }
    const token = Buffer.from(
      `${razorpayConfig.keyId}:${razorpayConfig.keySecret}`,
    ).toString("base64");
    return `Basic ${token}`;
  }

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `https://api.razorpay.com/v1${endpoint}`;
    const headers = {
      Authorization: this.authHeader,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        (data as any)?.error?.description ||
        `Razorpay API request failed with status ${response.status}`;
      throw new AppError(errorMessage, response.status);
    }

    return data as T;
  }

  async createOrder(opts: RazorpayOrderOptions) {
    return this.request<{
      id: string;
      entity: "order";
      amount: number;
      amount_paid: number;
      amount_due: number;
      currency: string;
      receipt: string | null;
      status: "created" | "attempted" | "paid";
      attempts: number;
      notes: Record<string, string>;
      created_at: number;
    }>("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: opts.amount,
        currency: opts.currency,
        receipt: opts.receipt,
        notes: opts.notes || {},
      }),
    });
  }

  async getOrder(orderId: string) {
    return this.request<{
      id: string;
      entity: "order";
      amount: number;
      status: string;
      created_at: number;
    }>(`/orders/${orderId}`, {
      method: "GET",
    });
  }

  async createSubscription(opts: RazorpaySubscriptionOptions) {
    return this.request<{
      id: string;
      entity: "subscription";
      plan_id: string;
      status: string;
      current_start: number | null;
      current_end: number | null;
      ended_at: number | null;
      charge_at: number | null;
      notes: Record<string, string>;
      short_url: string;
    }>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: opts.planId,
        total_count: opts.totalCount,
        quantity: opts.quantity ?? 1,
        customer_notify: opts.customerNotify ?? 1,
        notes: opts.notes || {},
      }),
    });
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtCycleEnd: boolean = false,
  ) {
    return this.request<{
      id: string;
      entity: "subscription";
      status: string;
    }>(`/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      body: JSON.stringify({
        cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
      }),
    });
  }
}

export const razorpayService = new RazorpayService();
