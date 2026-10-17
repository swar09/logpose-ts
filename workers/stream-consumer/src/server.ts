import express, { Express } from "express";
import { Server } from "node:http";
import { pingMongo } from "../../../src/lib/mongodb";
import { BatchProcessor } from "./services/batch-processor";
import { getDlqCount } from "./services/dlq.service";
import { kafkaConfig } from "../../../src/config";

export function createOpsServer(processor: BatchProcessor): {
  app: Express;
  start: (port: number) => Server;
} {
  const app = express();

  app.get("/healthz", (_req, res) => {
    res.json({
      status: "ok",
      service: "stream-consumer",
      bufferSize: processor.getBufferSize(),
      totalProcessed: processor.getTotalProcessed(),
      totalDlq: getDlqCount(),
      lastFlushAt: processor.getLastFlushAt(),
    });
  });

  app.get("/ready", async (_req, res) => {
    const isMongoReady = await pingMongo();
    if (isMongoReady) {
      res.json({ status: "ready", mongo: "connected" });
    } else {
      res.status(503).json({ status: "unready", mongo: "disconnected" });
    }
  });

  app.get("/metrics", (_req, res) => {
    res.json({
      bufferSize: processor.getBufferSize(),
      totalProcessed: processor.getTotalProcessed(),
      totalDlq: getDlqCount(),
      lastFlushAt: processor.getLastFlushAt(),
      batchSizeConfig: kafkaConfig.batchSize || 500,
      flushIntervalMs: kafkaConfig.flushIntervalMs || 2000,
    });
  });

  return {
    app,
    start: (port: number) =>
      app.listen(port, () => {
        console.log(`[Stream Consumer] Ops server listening on port ${port}`);
      }),
  };
}
