export enum PaymentStatus {
    CREATED,
    SUCESSFULL,
    FAILED,
    REJCTED,
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
    id: number,
    name: string,
    code: string,
    description?: string,
    amount: number,
    currency: string,
    interval: BillingInterval,
    max_urls_limit: number,
    custom_alias_allowed: boolean,
    analytics_retention_days: number,
    features: string[],
    is_active: boolean,
    created_at: Date,
    updated_at: Date,
}


export type NewPlan = {
    name: string,
    code: string,
    description?: string,
    amount: number,
    currency: string,
    interval: BillingInterval,
    max_urls_limit: number,
    custom_alias_allowed: boolean,
    analytics_retention_days: number,
    features: string[],
    is_active: boolean,
}


export type UserSubscription = {
    id: string,
    user_id: string,
    plan_id: number,
    status: SubscriptionStatus,
    razorpay_subscription_id?: string,
    razorpay_customer_id?: string,
    current_period_start?: Date,
    current_period_end?: Date,
    cancel_at_period_end: boolean,
    canceled_at?: Date,
    created_at: Date,
    updated_at: Date,
}


export type NewUserSubscription = {
    user_id: string,
    plan_id: number,
    status: SubscriptionStatus,
    razorpay_subscription_id?: string,
    razorpay_customer_id?: string,
    current_period_start?: Date,
    current_period_end?: Date,
    cancel_at_period_end: boolean,
}


export type Payment = {
    id: string,
    user_id: string,
    plan_id: number,
    subscription_id?: string,
    amount: number,
    currency: string,
    status: PaymentStatus,
    razorpay_order_id: string,
    razorpay_payment_id?: string,
    razorpay_signature?: string,
    error_code?: string,
    error_description?: string,
    created_at: Date,
    updated_at: Date,
}


export type NewPayment = {
    user_id: string,
    plan_id: number,
    subscription_id?: string,
    amount: number,
    currency: string,
    status: PaymentStatus,
    razorpay_order_id: string,
    razorpay_payment_id?: string,
    razorpay_signature?: string,
}


export type WebhookEvent = {
    id: string,
    event_id: string,
    event_type: string,
    status: WebhookProcessingStatus,
    payload: string[],
    error_log?: string,
    processed_at?: Date,
    created_at: Date,
}


export type NewWebhookEvent = {
    event_id: string,
    event_type: string,
    status: WebhookProcessingStatus,
    payload: string[],
}