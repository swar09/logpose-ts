import { Prisma, User } from "../generated/prisma/client";

export type UserWithoutPassword = Omit<User, "hashed_password">;
export type SafeUser = UserWithoutPassword;

export class UsersRepository {
    private readonly db: Prisma.TransactionClient;

    constructor(db: Prisma.TransactionClient) {
        this.db = db;
    }

    async create(userPayload: Prisma.UserCreateInput | Prisma.UserUncheckedCreateInput): Promise<User> {
        return this.db.user.create({
            data: userPayload,
        });
    }

    async deleteById(id: string): Promise<User> {
        return this.db.user.delete({
            where: { id },
        });
    }

    async updateUserInfo(id: string, data: Prisma.UserUpdateInput | Prisma.UserUncheckedUpdateInput): Promise<UserWithoutPassword> {
        return this.db.user.update({
            where: { id },
            data,
            omit: { hashed_password: true },
        });
    }

    async updatePassword(id: string, hashedPassword: string): Promise<User> {
        return this.db.user.update({
            where: { id },
            data: { hashed_password: hashedPassword },
        });
    }

    async getById(id: string): Promise<UserWithoutPassword | null> {
        return this.db.user.findUnique({
            where: { id },
            omit: { hashed_password: true },
        });
    }

    async getByEmail(email: string): Promise<UserWithoutPassword | null> {
        return this.db.user.findUnique({
            where: { email },
            omit: { hashed_password: true },
        });
    }

    async getByUsername(username: string): Promise<UserWithoutPassword | null> {
        return this.db.user.findUnique({
            where: { username },
            omit: { hashed_password: true },
        });
    }

    async getHashedPassword(id: string): Promise<string | null> {
        const user = await this.db.user.findUnique({
            where: { id },
            select: { hashed_password: true },
        });
        return user?.hashed_password ?? null;
    }

    async getHashedPasswordByLoginId(loginId: string): Promise<{ id: string; hashed_password: string } | null> {
        return this.db.user.findFirst({
            where: {
                OR: [
                    { email: loginId },
                    { username: loginId },
                ],
            },
            select: { id: true, hashed_password: true },
        });
    }
}