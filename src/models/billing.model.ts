import { z } from "zod";

export enum PaymentStatus {
  CREATED,
  SUCCESSFUL,
  FAILED,
  REJECTED,
}
export enum WebhookStatus {
  PENDING,
  COMPLETED,
  FAILED,
}
export enum SubscriptionStatus {
  HOLD,
  ACTIVE,
  CREATED,
  INACTIVE,
}

export enum BillingInterval {
  MONTHLY,
  WEEKLY,
  ANNUALLY,
}

export enum WebhookProcessingStatus {
  PENDING,
  PROCESSED,
  FAILED,
  IGNORED,
}

export type Plan = {
  id: number;
  name: string;
  code: string;
  description?: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  max_urls_limit: number;
  custom_alias_allowed: boolean;
  analytics_retention_days: number;
  features: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type NewPlan = {
  name: string;
  code: string;
  description?: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  max_urls_limit: number;
  custom_alias_allowed: boolean;
  analytics_retention_days: number;
  features: string[];
  is_active: boolean;
};

export type UserSubscription = {
  id: string;
  user_id: string;
  plan_id: number;
  status: SubscriptionStatus;
  razorpay_subscription_id?: string;
  razorpay_customer_id?: string;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  created_at: Date;
  updated_at: Date;
};

export type NewUserSubscription = {
  user_id: string;
  plan_id: number;
  status: SubscriptionStatus;
  razorpay_subscription_id?: string;
  razorpay_customer_id?: string;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end: boolean;
};

export type Payment = {
  id: string;
  user_id: string;
  plan_id: number;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  error_code?: string;
  error_description?: string;
  created_at: Date;
  updated_at: Date;
};

export type NewPayment = {
  user_id: string;
  plan_id: number;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export type WebhookEvent = {
  id: string;
  event_id: string;
  event_type: string;
  status: WebhookProcessingStatus;
  payload: string[];
  error_log?: string;
  processed_at?: Date;
  created_at: Date;
};

export type NewWebhookEvent = {
  event_id: string;
  event_type: string;
  status: WebhookProcessingStatus;
  payload: string[];
};

export const CreateBillingOrderSchema = z.object({
  plan_id: z.number().int().positive("Plan ID must be a positive integer"),
});
export type CreateBillingOrderDTO = z.infer<typeof CreateBillingOrderSchema>;

export const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay signature is required"),
});
export type VerifyPaymentDTO = z.infer<typeof VerifyPaymentSchema>;

export const CancelSubscriptionSchema = z.object({
  subscription_id: z.string().min(1, "Subscription ID is required"),
});
export type CancelSubscriptionDTO = z.infer<typeof CancelSubscriptionSchema>;

export const BillingIntervalSchema = z.enum(BillingInterval);

export const CreatePlanSchema = z.object({
  name: z.string().min(1, "Plan name is required").max(100),
  code: z.string().min(1, "Plan code is required").max(50),
  description: z.string().max(500).optional(),
  amount: z
    .number()
    .int()
    .positive("Amount must be a positive integer in cents"),
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter ISO code")
    .default("INR"),
  interval: BillingIntervalSchema.default(BillingInterval.MONTHLY),
  max_urls_limit: z.number().int().nonnegative(),
  custom_alias_allowed: z.boolean().default(false),
  analytics_retention_days: z.number().int().positive(),
  features: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});
export type CreatePlanDTO = z.infer<typeof CreatePlanSchema>;

export const RazorpayWebhookSchema = z.object({
  event: z.string().min(1, "Webhook event name is required"),
  payload: z.record(z.string(), z.any()),
  created_at: z.number().int().optional(),
});
export type RazorpayWebhookDTO = z.infer<typeof RazorpayWebhookSchema>;
