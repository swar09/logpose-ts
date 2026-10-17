import { billingRepo, prisma } from "../../../src/repositories";
import { scheduleConfig } from "../../../src/config";
import { SubscriptionReconciler } from "./services/subscription-reconciler";
import { createOpsServer } from "./server";

const PORT = Number(process.env.PORT) || 3003;
const INTERVAL_MS =
  Number(process.env.SUBSCRIPTION_RECONCILE_INTERVAL_MS) ||
  scheduleConfig.subscriptionReconcileIntervalMs ||
  60000;

async function bootstrap(): Promise<void> {
  console.log("[Subscription Reconciler] Starting worker bootstrap...");

  const reconciler = new SubscriptionReconciler(billingRepo, INTERVAL_MS);

  try {
    await reconciler.reconcileOnce();
  } catch (err) {
    console.error("[Subscription Reconciler] Initial reconciliation run failed:", err);
  }

  reconciler.start();

  const opsServer = createOpsServer(reconciler, prisma);
  const server = opsServer.start(PORT);

  const shutdown = async (signal: string) => {
    console.log(`[Subscription Reconciler] Received ${signal}. Shutting down gracefully...`);
    reconciler.stop();
    server.close();
    await prisma.$disconnect();
    console.log("[Subscription Reconciler] Graceful shutdown completed.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("[Subscription Reconciler Fatal] Bootstrap failed:", err);
  process.exit(1);
});
