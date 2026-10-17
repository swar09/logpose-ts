import { Router } from "express";
import {
  getAnalytics,
  getAnalyticsById,
  getAnalyticsStats,
  getShortCodeAnalytics,
  getShortCodeAnalyticsStats,
} from "../controllers/analytics.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  AnalyticsFilterQuerySchema,
  AnalyticsIdParamSchema,
  AnalyticsShortCodeParamSchema,
  AnalyticsStatsQuerySchema,
} from "../models/analytics.model";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/",
  authMiddleware,
  validate({ query: AnalyticsFilterQuerySchema }),
  getAnalytics,
);

analyticsRouter.get(
  "/stats",
  authMiddleware,
  validate({ query: AnalyticsStatsQuerySchema }),
  getAnalyticsStats,
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
  "/urls/:short_code/stats",
  authMiddleware,
  validate({
    params: AnalyticsShortCodeParamSchema,
    query: AnalyticsStatsQuerySchema,
  }),
  getShortCodeAnalyticsStats,
);

analyticsRouter.get(
  "/:id",
  authMiddleware,
  validate({ params: AnalyticsIdParamSchema }),
  getAnalyticsById,
);

export default analyticsRouter;
