import { Router } from "express";
import { redirectShortCode } from "../controllers/urls.controller";
import { analyticsMiddleware } from "../middlewares/analytics.middleware";
import { authRouter } from "./auth.routes";
import { billingRouter } from "./billing.routes";
import { healthRouter } from "./health.routes";
import { publicRouter } from "./public.routes";
import { urlsRouter } from "./urls.routes";
import { usersRouter } from "./users.routes";
import { webhooksRouter } from "./webhooks.routes";

export const appRouter = Router();

appRouter.use("/api", healthRouter);

appRouter.use("/api/v1/auth", authRouter);
appRouter.use("/api/v1/users", usersRouter);
appRouter.use("/api/v1/urls", urlsRouter);
appRouter.use("/api/v1/public", publicRouter);
appRouter.use("/api/v1/billing", billingRouter);
appRouter.use("/api/v1/webhooks", webhooksRouter);

appRouter.get("/:short_code", analyticsMiddleware, redirectShortCode);

export default appRouter;
