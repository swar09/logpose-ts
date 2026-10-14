import { Analytics, Prisma } from "../generated/prisma/client";
import { BatchPayload } from "../generated/prisma/internal/prismaNamespace";


export class AnalyticsRepository {
    private readonly db: Prisma.TransactionClient;

    constructor(db: Prisma.TransactionClient) {
        this.db = db;
    }

    async add(analytics: Prisma.AnalyticsCreateInput): Promise<Analytics> {
        return this.db.analytics.create({ data: analytics });
    }

    async batchAdd(analytics: Prisma.AnalyticsCreateManyInput): Promise<BatchPayload> {
        return this.db.analytics.createMany({ data: analytics });
    }

    async findById(id: string): Promise<Analytics | null> {
        return this.db.analytics.findUnique({
            where: { id }
        });
    }

    async findAllByShortCode(shortCode: string, page: number = 1, pageSize: number = 20): Promise<Analytics[] | null> {
        return this.db.analytics.findMany({
            where: {
                shortCode: shortCode
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: {
                clickedAt: 'desc'
            }
        });
    }

    async findInIntervalByShortCode(shortCode: string, startTime: Date, endTime?: Date, page: number = 1, pageSize: number = 20): Promise<Analytics[] | null> {
        const start = startTime;
        const end = endTime ?? new Date();
        return this.db.analytics.findMany({
            where: {
                clickedAt: {
                    gte: start,
                    lte: end,
                },
                shortCode: shortCode
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: {
                clickedAt: 'desc'
            }
        });
    }
}