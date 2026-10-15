import { Router } from "express";
import { getHealthStatus } from "../controllers/health.controller";

export const healthRouter = Router();

healthRouter.get("/health", getHealthStatus);

export default healthRouter;
