import base62 from "base62";
import { DatabaseId } from "../models/urls";
import { FF1 } from "ff1-js";

export class BaseConversion {
    private key: Buffer | string;
    private tweak: Buffer | string;
    private radix: number;
    private alphabet: string;
    private minLength?: number;
    private maxLength?: number;
    private fpeClient: FF1;

    constructor(
        key: Buffer | string,
        tweak: Buffer | string,
        radix: number = 10,
        alphabet: string = "0123456789",
        minLength?: number,
        maxLength?: number
    ) {
        this.key = key;
        this.tweak = tweak;
        this.radix = radix;
        this.alphabet = alphabet;
        this.minLength = minLength;
        this.maxLength = maxLength;
        this.fpeClient = new FF1(key, tweak, radix, alphabet, minLength, maxLength);
    }

    encode(dbId: DatabaseId): string {
        const obuscatedId = this.obuscate(dbId);
        const encoded = base62.encode(obuscatedId);
        return encoded;
    }

    decode(shortCode: string): DatabaseId {
        const decoded = base62.decode(shortCode);
        const databaseId = this.deObuscate(decoded);
        return databaseId;
    }

    obuscate(dbId: DatabaseId): number {
        const encrypted = this.fpeClient.encrypt(String(dbId));
        return Number(encrypted);
    }

    deObuscate(obuscatedId: number): number {
        const decrypted = this.fpeClient.decrypt(String(obuscatedId));
        return Number(decrypted);
    }

    obfuscate(dbId: DatabaseId): number {
        return this.obuscate(dbId);
    }

    deObfuscate(obfuscatedId: number): number {
        return this.deObuscate(obfuscatedId);
    }
}

export { BaseConversion as baseconversion };
