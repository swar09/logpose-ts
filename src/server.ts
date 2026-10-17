import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { appRouter } from "./routes";
import { config, initializeConfigs } from "./config";
import { kafkaProducerService } from "./services/kafka-producer.service";

const activeConfig = initializeConfigs();

export const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors());

app.use(
  express.json({
    limit: "10mb",
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(appRouter);

// 404 handler for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled application error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

const PORT = activeConfig.app.port;

kafkaProducerService.connect().catch((err) => {
  console.warn("[Logpose] Kafka producer background connect warning:", err);
});

export const server = app.listen(PORT, () => {
  console.log(
    `[Logpose] Server is running on port ${PORT} in ${activeConfig.app.nodeEnv} mode`,
  );
  console.log(
    `[Logpose] Health check available at: http://localhost:${PORT}/api/health`,
  );
});

async function gracefulShutdown(signal: string) {
  console.log(`[Logpose] Received ${signal}, closing HTTP server...`);

  try {
    await kafkaProducerService.disconnect();
  } catch (err) {
    console.error("[Logpose] Error disconnecting Kafka producer on shutdown:", err);
  }

  server.close(() => {
    console.log("[Logpose] HTTP server closed gracefully.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("[Logpose] Forcefully shutting down.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;

