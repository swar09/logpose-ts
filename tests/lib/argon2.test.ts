import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Argon2Hasher } from "../../src/lib/argon2";

describe("Argon2Hasher", () => {
  const originalPepper = process.env.PASSWORD_PEPPER;

  beforeEach(() => {
    delete process.env.PASSWORD_PEPPER;
  });

  afterEach(() => {
    if (originalPepper !== undefined) {
      process.env.PASSWORD_PEPPER = originalPepper;
    } else {
      delete process.env.PASSWORD_PEPPER;
    }
  });

  describe("hashing", () => {
    it("should generate a valid argon2id formatted hash", async () => {
      const hasher = new Argon2Hasher({ timeCost: 1, memoryCost: 1024 });
      const password = "mySecurePassword!";

      const hash = await hasher.hash(password);

      expect(hash).toMatch(
        /^\$argon2id\$v=19\$m=1024,t=1,p=1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/,
      );
    });

    it("should produce different hashes for the same password due to random salt", async () => {
      const hasher = new Argon2Hasher({ timeCost: 1, memoryCost: 1024 });
      const password = "mySecurePassword!";

      const hash1 = await hasher.hash(password);
      const hash2 = await hasher.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should use process.env.PASSWORD_PEPPER when options pepper is not specified", async () => {
      process.env.PASSWORD_PEPPER = "env-secret-pepper";
      const hasherFromEnv = new Argon2Hasher({ timeCost: 1, memoryCost: 1024 });
      const hasherNoPepper = new Argon2Hasher({
        pepper: "",
        timeCost: 1,
        memoryCost: 1024,
      });

      const hashWithPepper = await hasherFromEnv.hash("password");
      const isValidWithEnvPepper = await hasherFromEnv.verify(
        "password",
        hashWithPepper,
      );
      const isValidWithoutPepper = await hasherNoPepper.verify(
        "password",
        hashWithPepper,
      );

      expect(isValidWithEnvPepper).toBe(true);
      expect(isValidWithoutPepper).toBe(false);
    });
  });

  describe("verification", () => {
    it("should return true when password matches the hash", async () => {
      const hasher = new Argon2Hasher({ timeCost: 1, memoryCost: 1024 });
      const password = "correctHorseBatteryStaple";

      const hash = await hasher.hash(password);
      const result = await hasher.verify(password, hash);

      expect(result).toBe(true);
    });

    it("should return false when password does not match", async () => {
      const hasher = new Argon2Hasher({ timeCost: 1, memoryCost: 1024 });
      const hash = await hasher.hash("correctPassword");

      const result = await hasher.verify("wrongPassword", hash);

      expect(result).toBe(false);
    });

    it("should return true for plaintext match when hash does not start with $argon2id$", async () => {
      const hasher = new Argon2Hasher({ timeCost: 1, memoryCost: 1024 });
      const plainPassword = "legacyPassword123";

      const result = await hasher.verify(plainPassword, plainPassword);
      expect(result).toBe(true);

      const wrongResult = await hasher.verify("otherPassword", plainPassword);
      expect(wrongResult).toBe(false);
    });

    it("should return false if serialized hash is malformed", async () => {
      const hasher = new Argon2Hasher({ timeCost: 1, memoryCost: 1024 });

      expect(await hasher.verify("password", "$argon2id$v=19$incomplete")).toBe(
        false,
      );
      expect(
        await hasher.verify(
          "password",
          "$argon2i$v=19$m=1024,t=1,p=1$salt$hash",
        ),
      ).toBe(false);
    });

    it("should respect hash cost parameters encoded in the serialized hash", async () => {
      const cost1Hasher = new Argon2Hasher({ timeCost: 1, memoryCost: 1024 });
      const cost2Hasher = new Argon2Hasher({ timeCost: 2, memoryCost: 2048 });

      const hash = await cost1Hasher.hash("password123");

      const result = await cost2Hasher.verify("password123", hash);
      expect(result).toBe(true);
    });
  });
});
