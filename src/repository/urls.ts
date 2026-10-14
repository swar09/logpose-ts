import { Prisma, Url } from "../generated/prisma/client";
import { BatchPayload } from "../generated/prisma/internal/prismaNamespace";
import { UrlCreateManyArgs, UrlDeleteManyArgs } from "../generated/prisma/models";

export class UrlsRepository {
    private readonly db: Prisma.TransactionClient;

    constructor(db: Prisma.TransactionClient) {
        this.db = db;
    }

    async create(urlPayload: Url): Promise<Url> {
        return this.db.url.create({
            data: urlPayload
        });
    }

    async createMany(arg: UrlCreateManyArgs): Promise<BatchPayload> {
        return this.db.url.createMany(arg);
    }

    async deleteById(id: number): Promise<Url> {
        return this.db.url.delete({ where: { id } });
    }

    async deleteManyById(arg: UrlDeleteManyArgs): Promise<BatchPayload> {
        return this.db.url.deleteMany(arg);
    }

    async getLongUrlById(id: number): Promise<{ long_url: string } | null> {
        return this.db.url.findUnique({
            where: { id },
            select: { long_url: true },
        });
    }
    async getShortCodeById(id: number): Promise<{ short_code: string } | null> {
        return this.db.url.findUnique({
            where: { id },
            select: { short_code: true },
        });
    }
    async getById(id: number, author: string): Promise<Url | null> {
        return this.db.url.findUnique({
            where: {
                id, OR: [
                    { createdBy: author },
                    { guestId: author }
                ]
            },
        });
    }


}