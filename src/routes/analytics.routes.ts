import { Router } from "express";
import {
  getAnalytics,
  getAnalyticsById,
  getAnalyticsStats,
  getShortCodeAnalytics,
  getShortCodeAnalyticsStats,
  getUrlMetrics,
  getShortCodeMetrics,
} from "../controllers/analytics.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  AnalyticsFilterQuerySchema,
  AnalyticsIdParamSchema,
  AnalyticsShortCodeParamSchema,
  AnalyticsStatsQuerySchema,
  MetricsQuerySchema,
} from "../models/analytics.model";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/metrics",
  authMiddleware,
  validate({ query: MetricsQuerySchema }),
  getUrlMetrics,
);

analyticsRouter.get(
  "/urls/:short_code/metrics",
  authMiddleware,
  validate({
    params: AnalyticsShortCodeParamSchema,
    query: MetricsQuerySchema,
  }),
  getShortCodeMetrics,
);

analyticsRouter.get(
  "/stats",
  authMiddleware,
  validate({ query: AnalyticsStatsQuerySchema }),
  getAnalyticsStats,
);

analyticsRouter.get(
  "/urls/:short_code/stats",
  authMiddleware,
  validate({
    params: AnalyticsShortCodeParamSchema,
    query: AnalyticsStatsQuerySchema,
  }),
  getShortCodeAnalyticsStats,
);

analyticsRouter.get(
  "/",
  authMiddleware,
  validate({ query: AnalyticsFilterQuerySchema }),
  getAnalytics,
);

analyticsRouter.get(
  "/raw",
  authMiddleware,
  validate({ query: AnalyticsFilterQuerySchema }),
  getAnalytics,
);

analyticsRouter.get(
  "/urls/:short_code",
  authMiddleware,
  validate({
    params: AnalyticsShortCodeParamSchema,
    query: AnalyticsFilterQuerySchema,
  }),
  getShortCodeAnalytics,
);

analyticsRouter.get(
  "/urls/:short_code/raw",
  authMiddleware,
  validate({
    params: AnalyticsShortCodeParamSchema,
    query: AnalyticsFilterQuerySchema,
  }),
  getShortCodeAnalytics,
);

analyticsRouter.get(
  "/:id",
  authMiddleware,
  validate({ params: AnalyticsIdParamSchema }),
  getAnalyticsById,
);

export default analyticsRouter;
