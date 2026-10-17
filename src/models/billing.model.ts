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

export const CreateSubscriptionSchema = z.object({
  plan_id: z.number().int().positive("Plan ID must be a positive integer"),
  total_cycles: z.number().int().min(1).default(12),
});
export type CreateSubscriptionDTO = z.infer<typeof CreateSubscriptionSchema>;

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

export const RazorpaySupportedEvents = [
  "payment.authorized",
  "payment.captured",
  "payment.failed",
  "order.paid",
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.completed",
  "subscription.updated",
  "subscription.pending",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.resumed",
] as const;

export const RazorpayPaymentEntitySchema = z.object({
  id: z.string().startsWith("pay_"),
  entity: z.literal("payment").default("payment"),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  order_id: z.string().nullable().optional(),
  invoice_id: z.string().nullable().optional(),
  international: z.boolean().optional(),
  method: z.string().optional(),
  amount_refunded: z.number().optional(),
  refund_status: z.string().nullable().optional(),
  captured: z.boolean().optional(),
  description: z.string().nullable().optional(),
  card_id: z.string().nullable().optional(),
  bank: z.string().nullable().optional(),
  wallet: z.string().nullable().optional(),
  vpa: z.string().nullable().optional(),
  email: z.string().optional(),
  contact: z.string().optional(),
  notes: z.record(z.string(), z.any()).optional().default({}),
  fee: z.number().nullable().optional(),
  tax: z.number().nullable().optional(),
  error_code: z.string().nullable().optional(),
  error_description: z.string().nullable().optional(),
  error_source: z.string().nullable().optional(),
  error_step: z.string().nullable().optional(),
  error_reason: z.string().nullable().optional(),
  created_at: z.number().optional(),
});
export type RazorpayPaymentEntity = z.infer<typeof RazorpayPaymentEntitySchema>;

export const RazorpayOrderEntitySchema = z.object({
  id: z.string().startsWith("order_"),
  entity: z.literal("order").default("order"),
  amount: z.number(),
  amount_paid: z.number().optional(),
  amount_due: z.number().optional(),
  currency: z.string(),
  receipt: z.string().nullable().optional(),
  status: z.string(),
  attempts: z.number().optional(),
  notes: z.record(z.string(), z.any()).optional().default({}),
  created_at: z.number().optional(),
});
export type RazorpayOrderEntity = z.infer<typeof RazorpayOrderEntitySchema>;

export const RazorpaySubscriptionEntitySchema = z.object({
  id: z.string().startsWith("sub_"),
  entity: z.literal("subscription").default("subscription"),
  plan_id: z.string().optional(),
  customer_id: z.string().nullable().optional(),
  status: z.string(),
  current_start: z.number().nullable().optional(),
  current_end: z.number().nullable().optional(),
  ended_at: z.number().nullable().optional(),
  quantity: z.number().optional(),
  notes: z.record(z.string(), z.any()).optional().default({}),
  charge_at: z.number().nullable().optional(),
  start_at: z.number().nullable().optional(),
  end_at: z.number().nullable().optional(),
  auth_attempts: z.number().optional(),
  total_count: z.number().optional(),
  paid_count: z.number().optional(),
  remaining_count: z.number().optional(),
  short_url: z.string().optional(),
  created_at: z.number().optional(),
});
export type RazorpaySubscriptionEntity = z.infer<
  typeof RazorpaySubscriptionEntitySchema
>;

export const RazorpayWebhookPayloadContainerSchema = z.object({
  payment: z
    .object({
      entity: RazorpayPaymentEntitySchema,
    })
    .optional(),
  order: z
    .object({
      entity: RazorpayOrderEntitySchema,
    })
    .optional(),
  subscription: z
    .object({
      entity: RazorpaySubscriptionEntitySchema,
    })
    .optional(),
});

export const RazorpayWebhookSchema = z.object({
  entity: z.string().default("event"),
  account_id: z.string().optional(),
  event: z.string().min(1, "Webhook event name is required"),
  contains: z.array(z.string()).optional().default([]),
  payload: RazorpayWebhookPayloadContainerSchema.and(
    z.record(z.string(), z.any()),
  ),
  created_at: z.number().int().optional(),
});
export type RazorpayWebhookDTO = z.infer<typeof RazorpayWebhookSchema>;
