import { getDlqCollection } from "../../../../src/lib/mongodb";
import {
  DeadLetterDocument,
  DeadLetterReason,
} from "../../../../src/models/analytics.mongo";
import { kafkaConfig } from "../../../../src/config";

let totalDlq = 0;

export function getDlqCount(): number {
  return totalDlq;
}

export async function routeToDlq(
  originalPayload: unknown,
  errorReason: DeadLetterReason,
  errorDetails: unknown,
  sourceTopic: string = kafkaConfig.topicClicks,
): Promise<void> {
  try {
    const dlqCollection = await getDlqCollection();
    const deadLetter: DeadLetterDocument = {
      originalPayload,
      errorReason,
      errorDetails,
      failedAt: new Date(),
      sourceTopic,
      status: "UNRESOLVED",
    };

    await dlqCollection.insertOne(deadLetter);
    totalDlq++;
    console.warn(`[DLQ] Poison pill routed to dead_letter_events: ${errorReason}`);
  } catch (err) {
    console.error("[DLQ CRITICAL] Failed to write event to DLQ collection:", err);
  }
}
