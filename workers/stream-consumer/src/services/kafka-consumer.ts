import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import { kafkaConfig } from "../../../../src/config";
import { ClickEventPayloadSchema } from "../../../../src/models/analytics.mongo";
import { BatchProcessor } from "./batch-processor";
import { routeToDlq } from "./dlq.service";

export class KafkaStreamConsumer {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;
  private readonly processor: BatchProcessor;
  private isRunning = false;

  constructor(processor: BatchProcessor) {
    this.processor = processor;
    this.kafka = new Kafka({
      clientId: "analytics-stream-consumer",
      brokers:
        kafkaConfig.brokers && kafkaConfig.brokers.length > 0
          ? kafkaConfig.brokers
          : [kafkaConfig.broker],
    });
    this.consumer = this.kafka.consumer({
      groupId: kafkaConfig.groupId,
    });
  }

  async start(): Promise<void> {
    try {
      console.log(
        `[Kafka Consumer] Connecting to Kafka broker at ${kafkaConfig.broker}...`,
      );
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: kafkaConfig.topicClicks,
        fromBeginning: false,
      });

      console.log(
        `[Kafka Consumer] Subscribed to topic '${kafkaConfig.topicClicks}'. Listening for events...`,
      );

      this.isRunning = true;
      await this.consumer.run({
        eachMessage: this.handleMessage.bind(this),
      });
    } catch (err) {
      console.warn(
        `[Kafka Consumer Warning] Kafka broker unreachable at ${kafkaConfig.broker}: ${
          err instanceof Error ? err.message : String(err)
        }. Consumer running in standby mode.`,
      );
    }
  }

  async stop(): Promise<void> {
    if (this.isRunning) {
      await this.consumer.disconnect().catch(() => {});
      this.isRunning = false;
      console.log("[Kafka Consumer] Disconnected successfully.");
    }
  }

  private async handleMessage({
    message,
    topic,
  }: EachMessagePayload): Promise<void> {
    const rawString = message.value?.toString();
    if (!rawString) {
      await routeToDlq(
        null,
        "MALFORMED_JSON",
        "Message payload was empty or null",
        topic,
      );
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawString);
    } catch (err) {
      await routeToDlq(
        rawString,
        "MALFORMED_JSON",
        err instanceof Error ? err.message : String(err),
        topic,
      );
      return;
    }

    const eventData =
      parsed &&
      typeof parsed === "object" &&
      "payload" in parsed &&
      (parsed as any).payload
        ? (parsed as any).payload
        : parsed;

    const validation = ClickEventPayloadSchema.safeParse(eventData);
    if (!validation.success) {
      await routeToDlq(
        parsed,
        "SCHEMA_VALIDATION_FAILED",
        validation.error.issues,
        topic,
      );
      return;
    }

    await this.processor.push(validation.data);
  }
}
