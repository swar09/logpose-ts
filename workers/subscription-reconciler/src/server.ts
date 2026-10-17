import express, { Express } from "express";
import { Server } from "node:http";
import { PrismaClient } from "../../../src/generated/prisma/client";
import { SubscriptionReconciler } from "./services/subscription-reconciler";

export function createOpsServer(
  reconciler: SubscriptionReconciler,
  prisma: PrismaClient,
): {
  app: Express;
  start: (port: number) => Server;
} {
  const app = express();
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.json({
      status: "ok",
      service: "subscription-reconciler",
      ...reconciler.getMetrics(),
    });
  });

  app.get("/ready", async (_req, res) => {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
      res.json({ status: "ready", database: "connected" });
    } catch {
      res.status(503).json({ status: "unready", database: "disconnected" });
    }
  });

  app.get("/metrics", (_req, res) => {
    res.json(reconciler.getMetrics());
  });

  app.post("/reconcile", async (_req, res) => {
    try {
      const result = await reconciler.reconcileOnce();
      res.json({ status: "success", result });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  return {
    app,
    start: (port: number) =>
      app.listen(port, () => {
        console.log(`[Subscription Reconciler] Ops server listening on port ${port}`);
      }),
  };
}
