import { MongoClient, Db, Collection } from "mongodb";
import { mongoConfig } from "../config";
import {
  RawClickDocument,
  UrlMetricsDocument,
  DeadLetterDocument,
} from "../models/analytics.mongo";

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;

export async function getMongoDb(): Promise<Db> {
  if (db && isConnected) {
    return db;
  }

  if (!client) {
    client = new MongoClient(mongoConfig.uri, {
      maxPoolSize: mongoConfig.maxPoolSize,
      minPoolSize: mongoConfig.minPoolSize,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
  }

  await client.connect();
  db = client.db(mongoConfig.dbName);
  isConnected = true;
  return db;
}

export async function getRawClicksCollection(): Promise<Collection<RawClickDocument>> {
  const database = await getMongoDb();
  return database.collection<RawClickDocument>("raw_clicks");
}

export async function getUrlMetricsCollection(): Promise<Collection<UrlMetricsDocument>> {
  const database = await getMongoDb();
  return database.collection<UrlMetricsDocument>("url_metrics");
}

export async function getDlqCollection(): Promise<Collection<DeadLetterDocument>> {
  const database = await getMongoDb();
  return database.collection<DeadLetterDocument>("dead_letter_events");
}

export async function initMongoIndices(): Promise<void> {
  const rawClicks = await getRawClicksCollection();
  const urlMetrics = await getUrlMetricsCollection();
  const dlq = await getDlqCollection();

  await rawClicks.createIndex(
    { shortCode: 1, clickedAt: -1 },
    { background: true, name: "idx_raw_shortcode_clicked" },
  );
  await rawClicks.createIndex(
    { clickedAt: 1 },
    {
      expireAfterSeconds: 90 * 24 * 60 * 60,
      background: true,
      name: "ttl_raw_clicks_90d",
    },
  );

  await urlMetrics.createIndex(
    { shortCode: 1, date: -1 },
    { background: true, name: "idx_metrics_shortcode_date" },
  );
  await urlMetrics.createIndex(
    { userId: 1, date: -1 },
    { background: true, sparse: true, name: "idx_metrics_userid_date" },
  );

  await dlq.createIndex(
    { failedAt: -1 },
    { background: true, name: "idx_dlq_failed_at" },
  );
  await dlq.createIndex(
    { status: 1, failedAt: -1 },
    { background: true, name: "idx_dlq_status_failed" },
  );
  await dlq.createIndex(
    { failedAt: 1 },
    {
      expireAfterSeconds: 30 * 24 * 60 * 60,
      background: true,
      name: "ttl_dlq_30d",
    },
  );

  console.log("[MongoDB] All analytics and DLQ indexes initialized successfully.");
}

export async function pingMongo(): Promise<boolean> {
  try {
    const database = await getMongoDb();
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    isConnected = false;
    console.log("[MongoDB] Connection closed gracefully.");
  }
}
