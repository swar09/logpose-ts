import { Kafka, logLevel, Partitioners, Producer } from "kafkajs";
import { appConfig, kafkaConfig } from "../config";
import {
  createUrlClickEnvelope,
  sanitizeClickPayload,
  UrlClickEventPayload,
} from "../contracts/events/url-click.event";

export class KafkaProducerService {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private isConnected = false;
  private isConnecting = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
      connectionTimeout: kafkaConfig.connectionTimeout,
      requestTimeout: kafkaConfig.requestTimeout,
      logLevel: appConfig.isProduction ? logLevel.ERROR : logLevel.WARN,
      retry: {
        initialRetryTime: 300,
        retries: kafkaConfig.retries,
      },
    });
  }

  async connect(): Promise<boolean> {
    if (this.isConnected) return true;
    if (this.isConnecting) return false;

    this.isConnecting = true;
    try {
      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner,
        allowAutoTopicCreation: true,
        transactionTimeout: 30000,
      });

      this.producer.on(this.producer.events.CONNECT, () => {
        this.isConnected = true;
        console.log(`[KafkaProducer] Connected to brokers: ${kafkaConfig.brokers.join(", ")}`);
      });

      this.producer.on(this.producer.events.DISCONNECT, () => {
        this.isConnected = false;
        console.warn("[KafkaProducer] Disconnected from Kafka brokers");
      });

      await this.producer.connect();
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      console.warn(
        `[KafkaProducer WARNING] Failed to connect to Kafka brokers (${kafkaConfig.brokers.join(
          ", ",
        )}). Running in degraded mode:`,
        error instanceof Error ? error.message : error,
      );
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.producer || !this.isConnected) {
      return;
    }
    try {
      console.log("[KafkaProducer] Disconnecting producer...");
      await this.producer.disconnect();
      this.isConnected = false;
      this.producer = null;
      console.log("[KafkaProducer] Producer disconnected cleanly.");
    } catch (error) {
      console.error("[KafkaProducer] Error during disconnect:", error);
    }
  }

  async publishClick(
    raw: Parameters<typeof sanitizeClickPayload>[0],
  ): Promise<boolean> {
    const payload: UrlClickEventPayload = sanitizeClickPayload(raw);

    if (!this.producer || !this.isConnected) {
      const reconnected = await this.connect();
      if (!reconnected || !this.producer) {
        console.warn(
          `[KafkaProducer] Dropping analytics click event for shortCode=${payload.shortCode} (broker unreachable)`,
        );
        return false;
      }
    }

    try {
      const envelope = createUrlClickEnvelope(payload);
      const messageValue = JSON.stringify(envelope);

      await this.producer.send({
        topic: kafkaConfig.topics.urlClicks,
        messages: [
          {
            key: payload.shortCode,
            value: messageValue,
            headers: {
              eventType: "UrlClick",
              version: "1.0",
              source: "logpose-api",
            },
          },
        ],
      });

      return true;
    } catch (error) {
      console.error(
        `[KafkaProducer] Failed to send click event for shortCode=${payload.shortCode}:`,
        error,
      );
      return false;
    }
  }

  publishClickFireAndForget(
    raw: Parameters<typeof sanitizeClickPayload>[0],
  ): void {
    this.publishClick(raw).catch((err) => {
      console.error("[KafkaProducer] Unhandled error in fire-and-forget publish:", err);
    });
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      brokers: kafkaConfig.brokers,
      topic: kafkaConfig.topics.urlClicks,
    };
  }
}

export const kafkaProducerService = new KafkaProducerService();
export default kafkaProducerService;
