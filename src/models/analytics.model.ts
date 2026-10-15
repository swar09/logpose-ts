import { z } from "zod";

export type UrlAnalytics = {
    id: string;
    device?: string;
    browser?: string;
    referer?: string;
    short_code?: string;
    clicked_at: Date;
    ip_address: string;
    user_agent?: string;
    country_code?: string;
};

export type NewUrlAnalytics = {
    device?: string;
    browser?: string;
    referer?: string;
    short_code?: string;
    clicked_at: Date;
    ip_address: string;
    user_agent?: string;
    country_code?: string;
};

// Backward-compatibility type aliases
export type urlAnalytics = UrlAnalytics;
export type newUrlAnalytics = NewUrlAnalytics;

export const CreateAnalyticsSchema = z.object({
    device: z.string().optional(),
    browser: z.string().optional(),
    referer: z.string().max(2048).optional(),
    short_code: z.string().min(1).max(7).optional(),
    ip_address: z.string().min(1, "IP address is required"),
    user_agent: z.string().optional(),
    country_code: z.string().max(3).optional(),
    clicked_at: z.coerce.date().default(() => new Date()),
});
export type CreateAnalyticsDTO = z.infer<typeof CreateAnalyticsSchema>;

export const AnalyticsQuerySchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AnalyticsQueryDTO = z.infer<typeof AnalyticsQuerySchema>;