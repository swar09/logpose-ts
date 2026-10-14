import { Router } from "express";
import { getHealthStatus } from "../controllers/health";

const health_router = Router();

health_router.get("/health", getHealthStatus);

export default health_router;
