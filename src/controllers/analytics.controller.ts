import { Request, Response } from "express";
import {
  AnalyticsFilterQuery,
  AnalyticsIdParamDTO,
  AnalyticsShortCodeParamDTO,
  AnalyticsStatsQuery,
} from "../models/analytics.model";
import { UserRole } from "../models/users.model";
import { analyticsRepo, urlRepo } from "../repositories";
import {
  AnalyticsFilterCriteria,
  AnalyticsPaginationOptions,
} from "../repositories/analytics.repository";

export function isUserAdmin(role?: string | UserRole): boolean {
  return role === UserRole.ADMIN || (role as unknown) === "ADMIN";
}

export function canAccessUrlAnalytics(
  userId?: string,
  userRole?: string | UserRole,
  urlCreatedBy?: string | null,
): boolean {
  if (isUserAdmin(userRole)) {
    return true;
  }
  if (!urlCreatedBy) {
    return true;
  }
  return userId === urlCreatedBy;
}

function parseDateInput(val?: string | Date): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  const parsed = new Date(val);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function getAnalytics(
  req: Request<
    Record<string, never>,
    unknown,
    unknown,
    AnalyticsFilterQuery
  >,
  res: Response,
) {
  try {
    const userId = req.claims?.sub;
    const userRole = req.claims?.role;
    const isAdmin = isUserAdmin(userRole);

    const {
      short_code,
      from,
      to,
      start_time,
      end_time,
      country_code,
      device,
      ip_address,
      referer,
      page: queryPage,
      pageSize: queryPageSize,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const page = Math.max(1, Number(queryPage) || 1);
    const pageSize = Math.max(
      1,
      Math.min(Number(queryPageSize) || Number(limit) || 20, 100),
    );
    const startTime = parseDateInput(from ?? start_time);
    const endTime = parseDateInput(to ?? end_time);

    const filterCriteria: AnalyticsFilterCriteria = {
      ...(country_code && { countryCode: country_code }),
      ...(device && { device }),
      ...(ip_address && { ipAddress: ip_address }),
      ...(referer && { referer }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
    };

    if (short_code) {
      const existingUrl = await urlRepo.getByShortCode(short_code);
      if (!existingUrl) {
        return res.status(404).json({
          status: "error",
          message: "URL not found",
        });
      }

      if (!canAccessUrlAnalytics(userId, userRole, existingUrl.createdBy)) {
        return res.status(403).json({
          status: "error",
          message:
            "Forbidden: You are not authorized to view analytics for this URL",
        });
      }

      filterCriteria.shortCode = short_code;
    } else if (!isAdmin && userId) {
      filterCriteria.userId = userId;
    }

    const paginationOptions: AnalyticsPaginationOptions = {
      page,
      pageSize,
      sortBy: (sortBy as any) ?? "clickedAt",
      sortOrder: (sortOrder as any) ?? "desc",
    };

    const { data, total } = await analyticsRepo.findManyWithCount(
      filterCriteria,
      paginationOptions,
      true,
    );

    const totalPages = Math.ceil(total / pageSize);

    return res.status(200).json({
      status: "success",
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      ...(short_code && { short_code }),
    });
  } catch (error) {
    console.error("Failed to load analytics:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function getAnalyticsById(
  req: Request<
    AnalyticsIdParamDTO,
    unknown,
    unknown,
    Record<string, never>
  >,
  res: Response,
) {
  try {
    const { id } = req.params;
    const userId = req.claims?.sub;
    const userRole = req.claims?.role;
    const isAdmin = isUserAdmin(userRole);

    const analyticsRecord = await analyticsRepo.findById(id, true);
    if (!analyticsRecord) {
      return res.status(404).json({
        status: "error",
        message: "Analytics record not found",
      });
    }

    if (!isAdmin && userId && analyticsRecord.shortCode) {
      const associatedUrl = await urlRepo.getByShortCode(
        analyticsRecord.shortCode,
      );
      if (
        associatedUrl &&
        !canAccessUrlAnalytics(userId, userRole, associatedUrl.createdBy)
      ) {
        return res.status(403).json({
          status: "error",
          message:
            "Forbidden: You are not authorized to view this analytics record",
        });
      }
    }

    return res.status(200).json({
      status: "success",
      data: analyticsRecord,
    });
  } catch (error) {
    console.error("Failed to load analytics record by ID:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function getAnalyticsStats(
  req: Request<
    Record<string, never>,
    unknown,
    unknown,
    AnalyticsStatsQuery
  >,
  res: Response,
) {
  try {
    const userId = req.claims?.sub;
    const userRole = req.claims?.role;
    const isAdmin = isUserAdmin(userRole);

    const { short_code, from, to, start_time, end_time } = req.query;
    const startTime = parseDateInput(from ?? start_time);
    const endTime = parseDateInput(to ?? end_time);

    const filterCriteria: AnalyticsFilterCriteria = {
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
    };

    if (short_code) {
      const existingUrl = await urlRepo.getByShortCode(short_code);
      if (!existingUrl) {
        return res.status(404).json({
          status: "error",
          message: "URL not found",
        });
      }

      if (!canAccessUrlAnalytics(userId, userRole, existingUrl.createdBy)) {
        return res.status(403).json({
          status: "error",
          message:
            "Forbidden: You are not authorized to view analytics for this URL",
        });
      }

      filterCriteria.shortCode = short_code;
    } else if (!isAdmin && userId) {
      filterCriteria.userId = userId;
    }

    const stats = await analyticsRepo.getStats(filterCriteria);

    return res.status(200).json({
      status: "success",
      data: stats,
      ...(short_code && { short_code }),
    });
  } catch (error) {
    console.error("Failed to load analytics statistics:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function getShortCodeAnalytics(
  req: Request<
    AnalyticsShortCodeParamDTO,
    unknown,
    unknown,
    AnalyticsFilterQuery
  >,
  res: Response,
) {
  try {
    const { short_code } = req.params;
    const userId = req.claims?.sub;
    const userRole = req.claims?.role;

    const existingUrl = await urlRepo.getByShortCode(short_code);
    if (!existingUrl) {
      return res.status(404).json({
        status: "error",
        message: "URL not found",
      });
    }

    if (!canAccessUrlAnalytics(userId, userRole, existingUrl.createdBy)) {
      return res.status(403).json({
        status: "error",
        message:
          "Forbidden: You are not authorized to view analytics for this URL",
      });
    }

    const {
      from,
      to,
      start_time,
      end_time,
      country_code,
      device,
      ip_address,
      referer,
      page: queryPage,
      pageSize: queryPageSize,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const page = Math.max(1, Number(queryPage) || 1);
    const pageSize = Math.max(
      1,
      Math.min(Number(queryPageSize) || Number(limit) || 20, 100),
    );
    const startTime = parseDateInput(from ?? start_time);
    const endTime = parseDateInput(to ?? end_time);

    const filterCriteria: AnalyticsFilterCriteria = {
      shortCode: short_code,
      ...(country_code && { countryCode: country_code }),
      ...(device && { device }),
      ...(ip_address && { ipAddress: ip_address }),
      ...(referer && { referer }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
    };

    const paginationOptions: AnalyticsPaginationOptions = {
      page,
      pageSize,
      sortBy: (sortBy as any) ?? "clickedAt",
      sortOrder: (sortOrder as any) ?? "desc",
    };

    const { data, total } = await analyticsRepo.findManyWithCount(
      filterCriteria,
      paginationOptions,
      true,
    );

    const totalPages = Math.ceil(total / pageSize);

    return res.status(200).json({
      status: "success",
      short_code,
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Failed to load short code analytics:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function getShortCodeAnalyticsStats(
  req: Request<
    AnalyticsShortCodeParamDTO,
    unknown,
    unknown,
    AnalyticsStatsQuery
  >,
  res: Response,
) {
  try {
    const { short_code } = req.params;
    const userId = req.claims?.sub;
    const userRole = req.claims?.role;

    const existingUrl = await urlRepo.getByShortCode(short_code);
    if (!existingUrl) {
      return res.status(404).json({
        status: "error",
        message: "URL not found",
      });
    }

    if (!canAccessUrlAnalytics(userId, userRole, existingUrl.createdBy)) {
      return res.status(403).json({
        status: "error",
        message:
          "Forbidden: You are not authorized to view analytics for this URL",
      });
    }

    const { from, to, start_time, end_time } = req.query;
    const startTime = parseDateInput(from ?? start_time);
    const endTime = parseDateInput(to ?? end_time);

    const filterCriteria: AnalyticsFilterCriteria = {
      shortCode: short_code,
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
    };

    const stats = await analyticsRepo.getStats(filterCriteria);

    return res.status(200).json({
      status: "success",
      short_code,
      data: stats,
    });
  } catch (error) {
    console.error("Failed to load short code analytics statistics:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}