import { initMongoIndices, closeMongo } from "../../../src/lib/mongodb";
import { BatchProcessor } from "./services/batch-processor";
import { KafkaStreamConsumer } from "./services/kafka-consumer";
import { createOpsServer } from "./server";

const PORT = Number(process.env.PORT) || 3002;

async function bootstrap(): Promise<void> {
  console.log("[Stream Consumer] Starting worker bootstrap...");

  await initMongoIndices();

  const processor = new BatchProcessor();
  processor.start();

  const consumer = new KafkaStreamConsumer(processor);
  await consumer.start();

  const opsServer = createOpsServer(processor);
  const server = opsServer.start(PORT);

  const shutdown = async (signal: string) => {
    console.log(`[Stream Consumer] Received ${signal}. Shutting down gracefully...`);
    processor.stop();

    try {
      if (processor.getBufferSize() > 0) {
        console.log("[Stream Consumer] Flushing remaining buffer items...");
        await processor.flush();
      }

      await consumer.stop();
      await closeMongo();
      server.close();

      console.log("[Stream Consumer] Graceful shutdown completed.");
      process.exit(0);
    } catch (err) {
      console.error("[Stream Consumer] Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("[Stream Consumer Fatal] Bootstrap failed:", err);
  process.exit(1);
});
