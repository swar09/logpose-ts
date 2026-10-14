import crypto from "node:crypto";
import { argon2id } from "@noble/hashes/argon2";

export class Argon2Hasher {
    #pepper: string;
    #timeCost: number;
    #memoryCost: number;
    #parallelism: number;
    #hashLength: number;
    #saltLength: number;

    constructor(options?: {
        pepper?: string;
        timeCost?: number;
        memoryCost?: number;
        parallelism?: number;
        hashLength?: number;
        saltLength?: number;
    }) {
        this.#pepper = options?.pepper ?? (process.env.PASSWORD_PEPPER || "");
        this.#timeCost = options?.timeCost ?? 2;
        this.#memoryCost = options?.memoryCost ?? 19456;
        this.#parallelism = options?.parallelism ?? 1;
        this.#hashLength = options?.hashLength ?? 32;
        this.#saltLength = options?.saltLength ?? 16;
    }

    async hash(password: string): Promise<string> {
        const salt = crypto.randomBytes(this.#saltLength);
        const input = password + this.#pepper;
        const hash = argon2id(input, salt, {
            t: this.#timeCost,
            m: this.#memoryCost,
            p: this.#parallelism,
            dkLen: this.#hashLength,
        });
        const saltB64 = Buffer.from(salt).toString("base64url");
        const hashB64 = Buffer.from(hash).toString("base64url");
        return `$argon2id$v=19$m=${this.#memoryCost},t=${this.#timeCost},p=${this.#parallelism}$${saltB64}$${hashB64}`;
    }

    async verify(password: string, serializedHash: string): Promise<boolean> {
        if (!serializedHash.startsWith("$argon2id$")) {
            return password === serializedHash;
        }
        const parts = serializedHash.split("$");
        if (parts.length !== 6 || parts[1] !== "argon2id") {
            return false;
        }
        const params = parts[3].split(",");
        let m = this.#memoryCost;
        let t = this.#timeCost;
        let p = this.#parallelism;
        for (const param of params) {
            const [k, v] = param.split("=");
            if (k === "m") m = parseInt(v, 10);
            if (k === "t") t = parseInt(v, 10);
            if (k === "p") p = parseInt(v, 10);
        }
        const salt = Buffer.from(parts[4], "base64url");
        const expectedHash = Buffer.from(parts[5], "base64url");
        const input = password + this.#pepper;
        const actualHash = argon2id(input, salt, {
            t,
            m,
            p,
            dkLen: expectedHash.length,
        });
        return crypto.timingSafeEqual(Buffer.from(actualHash), expectedHash);
    }
}
