import { Prisma, PrismaClient } from "../generated/prisma/client";
import { Argon2Hasher } from "../lib/argon2";
import { extractTokenJtiAndRemainingTime } from "../lib/jwt";
import { RedisClient } from "./urls.repository";
import { UsersRepository } from "./users.repository";

export class AuthRepository {
  #redis?: RedisClient;
  #usersRepo: UsersRepository;
  #hasher: Argon2Hasher;

  constructor(
    usersRepoOrDb: UsersRepository | PrismaClient,
    redis?: RedisClient,
    hasher?: Argon2Hasher,
  ) {
    if ("getHashedPassword" in usersRepoOrDb) {
      this.#usersRepo = usersRepoOrDb as UsersRepository;
    } else {
      this.#usersRepo = new UsersRepository(usersRepoOrDb);
    }
    this.#redis = redis;
    this.#hasher = hasher ?? new Argon2Hasher();
  }

  async blacklistJti(jti: string, remainingTimeSeconds: number): Promise<void> {
    if (!this.#redis) {
      console.log(`Redis client not configured, cannot blacklist jti: ${jti}`);
      return;
    }
    try {
      await this.#redis.set(`bl:${jti}`, "true", "EX", remainingTimeSeconds);
    } catch (error) {
      console.error(`Redis error blacklisting jti ${jti}:`, error);
    }
  }

  async isJtiBlacklisted(jti: string): Promise<boolean> {
    if (!this.#redis) return false;
    try {
      const result = await this.#redis.get(`bl:${jti}`);
      return result !== null;
    } catch (error) {
      console.error(`Redis error checking blacklisted jti ${jti}:`, error);
      return false;
    }
  }

  async blacklistJtiWithExpiry(jti: string, exp: number | Date): Promise<void> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expSeconds =
      exp instanceof Date ? Math.floor(exp.getTime() / 1000) : exp;
    const remainingTime = Math.max(0, expSeconds - nowSeconds);
    if (remainingTime > 0) {
      await this.blacklistJti(jti, remainingTime);
    }
  }

  extractRemainingTimeAndJti(
    token: string,
  ): { jti: string; remainingTime: number } | null {
    return extractTokenJtiAndRemainingTime(token);
  }

  async blacklistToken(token: string): Promise<void> {
    const extracted = this.extractRemainingTimeAndJti(token);
    if (extracted && extracted.remainingTime > 0) {
      await this.blacklistJti(extracted.jti, extracted.remainingTime);
    }
  }

  async hashPassword(password: string): Promise<string> {
    return this.#hasher.hash(password);
  }

  async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return this.#hasher.verify(plainPassword, hashedPassword);
  }

  async verifyPasswordByUserId(
    userId: string,
    plainPassword: string,
  ): Promise<boolean> {
    const hashedPassword = await this.#usersRepo.getHashedPassword(userId);
    if (!hashedPassword) return false;
    return this.verifyPassword(plainPassword, hashedPassword);
  }

  async verifyPasswordByLoginId(
    loginId: string,
    plainPassword: string,
  ): Promise<{ success: boolean; userId?: string }> {
    const user = await this.#usersRepo.getHashedPasswordByLoginId(loginId);
    if (!user) return { success: false };
    const isMatch = await this.verifyPassword(
      plainPassword,
      user.hashed_password,
    );
    return { success: isMatch, userId: isMatch ? user.id : undefined };
  }
}
