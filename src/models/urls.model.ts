import { z } from "zod";

export type DatabaseId = number;

export type Url = {
    database_id: DatabaseId,
    short_code: string,
    long_url: string,
    created_by?: string,
    guest_id?: string,
    expires_at: Date,
    created_at: Date,
    updated_at: Date,
}

export type NewUrl = {
    long_url: string,
    short_code: string,
    created_by: string,
    guest_id: string,
    expires_at: Date,
}

export const CreateUrlSchema = z.object({
    long_url: z.url("Must be a valid URL").max(1024, "URL cannot exceed 1024 characters"),
    custom_alias: z.string().min(3, "Alias must be at least 3 characters")
        .max(7, "Alias cannot exceed 7 characters")
        .regex(/^[a-zA-Z0-9_-]+$/, "Alias must contain only letters, numbers, dashes, and underscores")
        .optional(),
    expires_at: z.coerce.date().optional(),
});
export type CreateUrlDTO = z.infer<typeof CreateUrlSchema>;

export const PublicShortenUrlSchema = z.object({
    long_url: z
        .url("Must be a valid URL")
        .max(1024, "URL cannot exceed 1024 characters"),
});
export type PublicShortenUrlDTO = z.infer<typeof PublicShortenUrlSchema>;

export const ShortCodeParamSchema = z.object({
    short_code: z
        .string()
        .min(1, "Short code cannot be empty")
        .max(7, "Short code cannot exceed 7 characters"),
});
export type ShortCodeParamDTO = z.infer<typeof ShortCodeParamSchema>;

export const UpdateUrlSchema = z.object({
    long_url: z.url("Must be a valid URL").max(1024).optional(),
    custom_alias: z
        .string()
        .min(3)
        .max(7)
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
});
export type UpdateUrlDTO = z.infer<typeof UpdateUrlSchema>;