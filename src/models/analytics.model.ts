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

export const AnalyticsIdParamSchema = z.object({
  id: z.string().uuid("Invalid analytics ID format, expected UUID"),
});
export type AnalyticsIdParamDTO = z.infer<typeof AnalyticsIdParamSchema>;

export const AnalyticsShortCodeParamSchema = z.object({
  short_code: z
    .string()
    .min(1, "Short code cannot be empty")
    .max(7, "Short code cannot exceed 7 characters"),
});
export type AnalyticsShortCodeParamDTO = z.infer<
  typeof AnalyticsShortCodeParamSchema
>;

export const AnalyticsFilterQuerySchema = z.object({
  short_code: z.string().max(7).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  country_code: z.string().max(10).optional(),
  device: z.string().max(50).optional(),
  ip_address: z.string().max(45).optional(),
  referer: z.string().max(2048).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z
    .enum(["clickedAt", "shortCode", "countryCode", "device"])
    .default("clickedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type AnalyticsFilterQueryDTO = z.infer<
  typeof AnalyticsFilterQuerySchema
>;

export interface AnalyticsFilterQuery {
  short_code?: string;
  from?: string;
  to?: string;
  start_time?: string;
  end_time?: string;
  country_code?: string;
  device?: string;
  ip_address?: string;
  referer?: string;
  page?: string;
  pageSize?: string;
  limit?: string;
  sortBy?: "clickedAt" | "shortCode" | "countryCode" | "device";
  sortOrder?: "asc" | "desc";
}

export const AnalyticsStatsQuerySchema = z.object({
  short_code: z.string().max(7).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
});
export type AnalyticsStatsQueryDTO = z.infer<typeof AnalyticsStatsQuerySchema>;

export interface AnalyticsStatsQuery {
  short_code?: string;
  from?: string;
  to?: string;
  start_time?: string;
  end_time?: string;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AnalyticsRecordDTO {
  id: string;
  shortCode: string;
  clickedAt: Date;
  ipAddress: string;
  userAgent: string;
  device: string;
  countryCode: string;
  referer: string;
  urlAnalytics?: {
    id: number;
    short_code: string | null;
    long_url: string;
    createdBy: string | null;
    expiresAt: Date;
    createdAt: Date;
  } | null;
}

export interface PaginatedAnalyticsResponse<T = AnalyticsRecordDTO> {
  status: "success";
  data: T[];
  pagination: PaginationMetadata;
  short_code?: string;
}

export interface DeviceCountDTO {
  device: string;
  count: number;
}

export interface CountryCountDTO {
  countryCode: string;
  count: number;
}

export interface RefererCountDTO {
  referer: string;
  count: number;
}

export interface AnalyticsStatsDataDTO {
  totalClicks: number;
  clicksByDevice: DeviceCountDTO[];
  clicksByCountry: CountryCountDTO[];
  clicksByReferer: RefererCountDTO[];
}

export interface AnalyticsStatsResponse {
  status: "success";
  short_code?: string;
  data: AnalyticsStatsDataDTO;
}

export interface SingleAnalyticsResponse {
  status: "success";
  data: AnalyticsRecordDTO;
}

export interface ErrorResponse {
  status: "error";
  message: string;
  errors?: unknown;
}
