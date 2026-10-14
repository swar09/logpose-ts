import { Prisma, Url } from "../generated/prisma/client";
import { BatchPayload } from "../generated/prisma/internal/prismaNamespace";
import { UrlCreateManyArgs, UrlDeleteManyArgs } from "../generated/prisma/models";

export type UrlWithoutId = Omit<Url, "id">;
export type SafeUrl = UrlWithoutId;

export class UrlsRepository {
    private readonly db: Prisma.TransactionClient;

    constructor(db: Prisma.TransactionClient) {
        this.db = db;
    }

    async create(urlPayload: Prisma.UrlCreateInput | Prisma.UrlUncheckedCreateInput): Promise<UrlWithoutId> {
        return this.db.url.create({
            data: urlPayload,
            omit: { id: true },
        });
    }

    async createMany(arg: UrlCreateManyArgs): Promise<BatchPayload> {
        return this.db.url.createMany(arg);
    }

    async deleteById(id: number): Promise<Url> {
        return this.db.url.delete({
            where: { id },
        });
    }

    async deleteByShortCode(shortCode: string): Promise<UrlWithoutId> {
        return this.db.url.delete({
            where: { short_code: shortCode },
            omit: { id: true },
        });
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

    async getByAuthorId(authorId: string): Promise<UrlWithoutId | null> {
        return this.db.url.findFirst({
            where: {
                OR: [
                    { createdBy: authorId },
                    { guestId: authorId },
                ],
            },
            omit: { id: true },
        });
    }

    async modifyById(id: number, data: Prisma.UrlUpdateInput | Prisma.UrlUncheckedUpdateInput): Promise<Url> {
        return this.db.url.update({
            where: { id },
            data,
        });
    }

    async updateShortCodeById(id: number, shortCode: string): Promise<{ short_code: string; long_url: string }> {
        return this.db.url.update({
            where: { id },
            data: { short_code: shortCode },
            select: {
                short_code: true,
                long_url: true,
            },
        });
    }

    async updateShortCodeByShortCode(currentShortCode: string, newShortCode: string): Promise<{ short_code: string; long_url: string }> {
        return this.db.url.update({
            where: { short_code: currentShortCode },
            data: { short_code: newShortCode },
            select: {
                short_code: true,
                long_url: true,
            },
        });
    }

    async getUrlsByUserId(userId: string, page: number = 1, pageSize: number = 20): Promise<UrlWithoutId[]> {
        return this.db.url.findMany({
            where: { createdBy: userId },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: {
                createdAt: "desc",
            },
            omit: { id: true },
        });
    }

    async getUrlsByGuestId(guestId: string, page: number = 1, pageSize: number = 20): Promise<UrlWithoutId[]> {
        return this.db.url.findMany({
            where: { guestId },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: {
                createdAt: "desc",
            },
            omit: { id: true },
        });
    }

    async getByShortCode(shortCode: string): Promise<UrlWithoutId | null> {
        return this.db.url.findUnique({
            where: { short_code: shortCode },
            omit: { id: true },
        });
    }
}