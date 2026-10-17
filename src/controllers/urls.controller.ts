import { Request, Response } from "express";
import crypto from "node:crypto";
import {
    CreateUrlDTO,
    PublicShortenUrlDTO,
    ShortCodeParamDTO,
    UpdateUrlDTO,
} from "../models/urls.model";
import { UserRole } from "../models/users.model";
import { analyticsRepo, urlRepo } from "../repositories";
import { baseConverter } from "../lib/base62";
import { kafkaProducerService } from "../services/kafka-producer.service";

export interface UrlsPaginationQuery {
    page?: string;
    pageSize?: string;
}

export interface UrlAnalyticsQuery extends UrlsPaginationQuery {
    start_time?: string;
    end_time?: string;
}

export interface QrCodeQuery {
    url?: string;
    short_code?: string;
}

export async function createUrl(
    req: Request<Record<string, never>, unknown, CreateUrlDTO>,
    res: Response,
) {
    try {
        const userId = req.claims?.sub;
        if (!userId) {
            return res.status(401).json({
                status: "error",
                message: "Unauthorized: Missing user authentication",
            });
        }

        const { long_url, custom_alias, expires_at } = req.body;

        // Default 1 year expiry for registered users
        const expiresAt =
            expires_at ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        if (custom_alias) {
            const exists = await urlRepo.getByShortCode(custom_alias);
            if (exists) {
                return res.status(409).json({
                    status: "error",
                    message: "Custom alias is already taken",
                });
            }

            const newUrl = await urlRepo.create({
                long_url,
                short_code: custom_alias,
                createdBy: userId,
                expiresAt,
            });

            return res.status(201).json({
                status: "success",
                message: "URL created successfully",
                data: newUrl,
            });
        }

        const tempCode = `t${crypto.randomBytes(3).toString("hex")}`;
        const inserted = await urlRepo.create({
            long_url,
            short_code: tempCode,
            createdBy: userId,
            expiresAt,
        });

        const shortCode = baseConverter.encode(inserted.id).slice(0, 7);

        await urlRepo.updateShortCodeById(inserted.id, shortCode);

        return res.status(201).json({
            status: "success",
            message: "URL created successfully",
            data: {
                ...inserted,
                short_code: shortCode,
            },
        });
    } catch (error) {
        console.error("Failed to create URL:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

export async function getUrlsQr(
    req: Request<Record<string, never>, unknown, unknown, QrCodeQuery>,
    res: Response,
) {
    try {
        const { url, short_code } = req.query;
        let targetUrl = url;

        if (!targetUrl && short_code) {
            const found = await urlRepo.getByShortCode(short_code);
            if (found) {
                targetUrl = found.long_url;
            }
        }

        if (!targetUrl) {
            return res.status(400).json({
                status: "error",
                message: "Either url or short_code query parameter is required",
            });
        }

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
            targetUrl,
        )}`;

        return res.status(200).json({
            status: "success",
            qr_code_url: qrCodeUrl,
            target_url: targetUrl,
        });
    } catch (error) {
        console.error("Failed to generate QR code:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

export async function shortenPublicUrl(
    req: Request<Record<string, never>, unknown, PublicShortenUrlDTO>,
    res: Response,
) {
    try {
        const { long_url } = req.body;
        const guestId =
            (req.headers["x-guest-id"] as string) ||
            (req.ip ? `guest_${req.ip}` : crypto.randomUUID());

        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const inserted = await urlRepo.create({
            long_url,
            guestId,
            expiresAt,
        });

        const shortCode = baseConverter.encode(inserted.id).slice(0, 7);

        await urlRepo.updateShortCodeById(inserted.id, shortCode);

        return res.status(201).json({
            status: "success",
            message: "Public URL shortened successfully",
            data: {
                ...inserted,
                short_code: shortCode,
            },
        });
    } catch (error) {
        console.error("Failed to shorten public URL:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

export async function getPublicMyUrls(
    req: Request<
        Record<string, never>,
        unknown,
        unknown,
        { guest_id?: string; page?: string; pageSize?: string }
    >,
    res: Response,
) {
    try {
        const guestId =
            req.query.guest_id ||
            (req.headers["x-guest-id"] as string) ||
            (req.ip ? `guest_${req.ip}` : undefined);

        if (!guestId) {
            return res.status(400).json({
                status: "error",
                message: "guest_id is required via query param or x-guest-id header",
            });
        }

        const page = req.query.page
            ? Math.max(1, parseInt(req.query.page, 10) || 1)
            : 1;
        const pageSize = req.query.pageSize
            ? Math.max(1, parseInt(req.query.pageSize, 10) || 20)
            : 20;

        const urls = await urlRepo.getUrlsByGuestId(guestId, page, pageSize);

        return res.status(200).json({
            status: "success",
            data: urls,
            pagination: {
                page,
                pageSize,
            },
        });
    } catch (error) {
        console.error("Failed to fetch public URLs:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

export async function getUrlByShortCode(
    req: Request<ShortCodeParamDTO>,
    res: Response,
) {
    try {
        const { short_code } = req.params;

        const url = await urlRepo.getByShortCode(short_code);
        if (!url) {
            return res.status(404).json({
                status: "error",
                message: "URL not found",
            });
        }

        if (new Date(url.expiresAt) < new Date()) {
            return res.status(410).json({
                status: "error",
                message: "URL has expired",
            });
        }

        return res.status(200).json({
            status: "success",
            data: url,
        });
    } catch (error) {
        console.error("Failed to fetch URL:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

export async function updateUrlByShortCode(
    req: Request<ShortCodeParamDTO, unknown, UpdateUrlDTO>,
    res: Response,
) {
    try {
        const { short_code } = req.params;
        const { long_url, custom_alias } = req.body;

        const existing = await urlRepo.getByShortCode(short_code);
        if (!existing) {
            return res.status(404).json({
                status: "error",
                message: "URL not found",
            });
        }

        const userId = req.claims?.sub;
        const isAdmin =
            req.claims?.role === UserRole.ADMIN ||
            (req.claims?.role as unknown) === "ADMIN";
        if (!isAdmin && userId && existing.createdBy && existing.createdBy !== userId) {
            return res.status(403).json({
                status: "error",
                message: "Forbidden: You are not authorized to update this URL",
            });
        }

        if (custom_alias && custom_alias !== short_code) {
            const aliasTaken = await urlRepo.getByShortCode(custom_alias);
            if (aliasTaken) {
                return res.status(409).json({
                    status: "error",
                    message: "Custom alias is already taken",
                });
            }
        }

        const updated = await urlRepo.updateByShortCode(short_code, {
            ...(long_url && { long_url }),
            ...(custom_alias && { short_code: custom_alias }),
        });

        return res.status(200).json({
            status: "success",
            message: "URL updated successfully",
            data: updated,
        });
    } catch (error) {
        console.error("Failed to update URL:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

export async function deleteUrlByShortCode(
    req: Request<ShortCodeParamDTO>,
    res: Response,
) {
    try {
        const { short_code } = req.params;

        const existing = await urlRepo.getByShortCode(short_code);
        if (!existing) {
            return res.status(404).json({
                status: "error",
                message: "URL not found",
            });
        }

        const userId = req.claims?.sub;
        const isAdmin =
            req.claims?.role === UserRole.ADMIN ||
            (req.claims?.role as unknown) === "ADMIN";
        if (!isAdmin && userId && existing.createdBy && existing.createdBy !== userId) {
            return res.status(403).json({
                status: "error",
                message: "Forbidden: You are not authorized to delete this URL",
            });
        }

        await urlRepo.deleteByShortCode(short_code);

        return res.status(200).json({
            status: "success",
            message: "URL deleted successfully",
        });
    } catch (error) {
        console.error("Failed to delete URL:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

export async function getUrlAnalytics(
    req: Request<ShortCodeParamDTO, unknown, unknown, UrlAnalyticsQuery>,
    res: Response,
) {
    try {
        const { short_code } = req.params;

        const existing = await urlRepo.getByShortCode(short_code);
        if (!existing) {
            return res.status(404).json({
                status: "error",
                message: "URL not found",
            });
        }

        const userId = req.claims?.sub;
        const isAdmin =
            req.claims?.role === UserRole.ADMIN ||
            (req.claims?.role as unknown) === "ADMIN";
        if (!isAdmin && userId && existing.createdBy && existing.createdBy !== userId) {
            return res.status(403).json({
                status: "error",
                message: "Forbidden: You are not authorized to view analytics for this URL",
            });
        }

        const page = req.query.page
            ? Math.max(1, parseInt(req.query.page, 10) || 1)
            : 1;
        const pageSize = req.query.pageSize
            ? Math.max(1, parseInt(req.query.pageSize, 10) || 20)
            : 20;

        let analytics;
        if (req.query.start_time) {
            const startTime = new Date(req.query.start_time);
            const endTime = req.query.end_time
                ? new Date(req.query.end_time)
                : new Date();
            analytics = await analyticsRepo.findInIntervalByShortCode(
                short_code,
                startTime,
                endTime,
                page,
                pageSize,
            );
        } else {
            analytics = await analyticsRepo.findAllByShortCode(
                short_code,
                page,
                pageSize,
            );
        }

        return res.status(200).json({
            status: "success",
            short_code,
            data: analytics ?? [],
            pagination: {
                page,
                pageSize,
            },
        });
    } catch (error) {
        console.error("Failed to fetch URL analytics:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

export async function getUrlQrByShortCode(
    req: Request<ShortCodeParamDTO>,
    res: Response,
) {
    try {
        const { short_code } = req.params;

        const existing = await urlRepo.getByShortCode(short_code);
        if (!existing) {
            return res.status(404).json({
                status: "error",
                message: "URL not found",
            });
        }

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
            existing.long_url,
        )}`;

        return res.status(200).json({
            status: "success",
            short_code,
            target_url: existing.long_url,
            qr_code_url: qrCodeUrl,
        });
    } catch (error) {
        console.error("Failed to generate QR code:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

export async function redirectShortCode(
    req: Request<ShortCodeParamDTO>,
    res: Response,
) {
    try {
        const { short_code } = req.params;

        const longUrl = await urlRepo.getLongUrlByShortCode(short_code);
        if (!longUrl) {
            return res.status(404).json({
                status: "error",
                message: "URL not found or has expired",
            });
        }

        if (req.analytics) {
            kafkaProducerService.publishClickFireAndForget({
                shortCode: short_code,
                clickedAt: req.analytics.clicked_at,
                ipAddress: req.analytics.ip_address || "unknown",
                userAgent: req.analytics.user_agent || "unknown",
                device: req.analytics.device || "unknown",
                browser: req.analytics.browser,
                countryCode: req.analytics.country_code || "unknown",
                referer: req.analytics.referer || "direct",
            });
        }

        return res.redirect(302, longUrl);
    } catch (error) {
        console.error("Failed to redirect short URL:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}
