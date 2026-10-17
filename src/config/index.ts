import "dotenv/config";

/**
 * Application & Server configuration
 */
export const appConfig = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
};

/**
 * Database & Repository configuration
 */
export const dbConfig = {
  url:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/mydb?schema=public",
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.POSTGRES_DB || "mydb",
};

/**
 * Redis & Caching configuration
 */
export const redisConfig = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || "",
  defaultTTL: Number(process.env.REDIS_DEFAULT_TTL) || 3600, // 1 hour
};

export const mongoConfig = {
  uri:
    process.env.MONGO_URI ||
    "mongodb://admin:adminpassword@localhost:27017/logpose_analytics?authSource=admin",
  dbName: process.env.MONGO_DB || "logpose_analytics",
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
  minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 5,
};

export const kafkaConfig = {
  broker: process.env.KAFKA_BROKER || process.env.KAFKA_BROKERS || "localhost:9092",
  brokers: (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || "localhost:9092")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean),
  clientId: process.env.KAFKA_CLIENT_ID || "logpose-api",
  topicClicks: process.env.KAFKA_TOPIC_CLICKS || process.env.KAFKA_CLICK_TOPIC || "url-clicks",
  topics: {
    urlClicks: process.env.KAFKA_CLICK_TOPIC || process.env.KAFKA_TOPIC_CLICKS || "url-clicks",
  },
  groupId: process.env.KAFKA_GROUP_ID || "analytics-stream-consumers",
  batchSize: Number(process.env.STREAM_BATCH_SIZE) || 500,
  flushIntervalMs: Number(process.env.STREAM_FLUSH_INTERVAL_MS) || 2000,
  connectionTimeout: Number(process.env.KAFKA_CONNECTION_TIMEOUT_MS) || 5000,
  requestTimeout: Number(process.env.KAFKA_REQUEST_TIMEOUT_MS) || 30000,
  retries: Number(process.env.KAFKA_MAX_RETRIES) || 5,
};

/**
 * Argon2 Password Hasher configuration
 */
export const hasherConfig = {
  get pepper(): string {
    return process.env.PASSWORD_PEPPER || "";
  },
  set pepper(val: string) {
    process.env.PASSWORD_PEPPER = val;
  },
  timeCost: Number(process.env.ARGON2_TIME_COST) || 2,
  memoryCost: Number(process.env.ARGON2_MEMORY_COST) || 19456, // 19 MB
  parallelism: Number(process.env.ARGON2_PARALLELISM) || 1,
  hashLength: Number(process.env.ARGON2_HASH_LENGTH) || 32,
  saltLength: Number(process.env.ARGON2_SALT_LENGTH) || 16,
};

/**
 * Google OAuth 2.0 configuration
 */
export const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  redirectUri: process.env.GOOGLE_REDIRECT_URI || "",
  get isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri);
  },
};

/**
 * JWT Authentication configuration
 */
export const jwtConfig = {
  secret: process.env.JWT_SECRET || "default_jwt_secret_change_in_production",
  expiresInSeconds: Number(process.env.JWT_EXPIRES_IN) || 7 * 24 * 60 * 60, // 7 days
  issuer: process.env.JWT_ISSUER || "logpose",
};

/**
 * Format-Preserving Encryption (FF1) & Base62 configuration
 */
export const base62Config = {
  key: process.env.BASE62_KEY || "2b7e151628aed2a6abf7158809cf4f3c",
  tweak: process.env.BASE62_TWEAK || "",
};

/**
 * Background Scheduler & Worker Tasks configuration
 */
export const scheduleConfig = {
  analyticsRetentionDays: Number(process.env.ANALYTICS_RETENTION_DAYS) || 90,
  retentionCleanupIntervalMs:
    Number(process.env.RETENTION_CLEANUP_INTERVAL_MS) || 3600000,
  urlExpiryIntervalMs: Number(process.env.URL_EXPIRY_INTERVAL_MS) || 300000,
  subscriptionReconcileIntervalMs:
    Number(process.env.SUBSCRIPTION_RECONCILE_INTERVAL_MS) || 60000,
};

export const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || "",
  keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  get isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  },
};

/**
 * Authentication aggregate configuration
 */
export const authConfig = {
  jwt: jwtConfig,
  google: googleConfig,
};

/**
 * Global application configuration object loaded once at startup
 */
export const config = {
  app: appConfig,
  db: dbConfig,
  mongo: mongoConfig,
  redis: redisConfig,
  hasher: hasherConfig,
  jwt: jwtConfig,
  google: googleConfig,
  base62: base62Config,
  auth: authConfig,
  schedule: scheduleConfig,
  kafka: kafkaConfig,
  razorpay: razorpayConfig,
};

/**
 * Initializes and validates application configuration settings
 */
export function initializeConfigs() {
  if (
    appConfig.isProduction &&
    jwtConfig.secret === "default_jwt_secret_change_in_production"
  ) {
    console.warn(
      "[CONFIG WARNING] Using default JWT secret in production mode! Set JWT_SECRET environment variable.",
    );
  }

  if (appConfig.isProduction && !hasherConfig.pepper) {
    console.warn(
      "[CONFIG WARNING] PASSWORD_PEPPER is not set in production mode! A secure pepper is strongly recommended.",
    );
  }

  return {
    ...config,
    initializedAt: new Date().toISOString(),
  };
}

export const initConfigs = initializeConfigs;

export default config;
