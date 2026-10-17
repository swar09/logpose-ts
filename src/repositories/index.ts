import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { dbConfig } from "../config";
import { UsersRepository } from "./users.repository";
import { UrlsRepository } from "./urls.repository";
import { AnalyticsRepository } from "./analytics.repository";
import { AuthRepository } from "./auth.repository";
import { BillingRepository } from "./billing.repository";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: dbConfig.url }),
});

export const userRepo = new UsersRepository(prisma);
export const urlRepo = new UrlsRepository(prisma);
export const analyticsRepo = new AnalyticsRepository(prisma);
export const authRepo = new AuthRepository(prisma);
export const billingRepo = new BillingRepository(prisma);