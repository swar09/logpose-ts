import { Request, Response } from "express";

export async function getHealthStatus(req: Request, res: Response) {
    const response = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    };
    res.status(200).json(response)
}
