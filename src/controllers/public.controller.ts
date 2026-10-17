import { Request, Response } from "express";
import crypto from "node:crypto";
import { PublicShortenUrlDTO } from "../models/urls.model";
import { urlRepo } from "../repositories";
import { baseConverter } from "../lib/base62";

export interface PublicUrlsQuery {
  guest_id?: string;
  page?: string;
  pageSize?: string;
}

export interface QrQuery {
  url?: string;
  short_code?: string;
}

export async function publicShortenUrl(
  req: Request<Record<string, never>, unknown, PublicShortenUrlDTO>,
  res: Response,
) {
  try {
    const { long_url } = req.body;
    const guestId =
      (req.headers["x-guest-id"] as string) ||
      (req.ip ? `guest_${req.ip}` : crypto.randomUUID());

    // Public URLs expire after 30 days by default
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const tempShortCode = `t${crypto.randomBytes(3).toString("hex")}`;
    const inserted = await urlRepo.create({
      long_url,
      short_code: tempShortCode,
      guestId,
      expiresAt,
    });

    const shortCode = baseConverter.encode(inserted.id).slice(0, 7);

    await urlRepo.updateShortCodeById(inserted.id, shortCode);

    return res.status(201).json({
      status: "success",
      message: "URL shortened successfully",
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

export async function getPublicUserUrls(
  req: Request<Record<string, never>, unknown, unknown, PublicUrlsQuery>,
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
    console.error("Failed to fetch public user URLs:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function getPublicQrCode(
  req: Request<Record<string, never>, unknown, unknown, QrQuery>,
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
