import { Request, Response, Router } from "express";

const health_router = Router();

health_router.get("/health", getHealthStatus);

async function getHealthStatus(req: Request, res: Response) {
}

export default health_router;
