import base62 from "base62";
import { DatabaseId } from "../models/urls.model";
import { FF1 } from "ff1-js";

export class BaseConversion {
  #key: Buffer | string;
  #tweak: Buffer | string;
  #radix: number;
  #alphabet: string;
  #minLength?: number;
  #maxLength?: number;
  #fpeClient: FF1;

  constructor(
    key: Buffer | string,
    tweak: Buffer | string,
    radix: number = 10,
    alphabet: string = "0123456789",
    minLength?: number,
    maxLength?: number,
  ) {
    this.#key = key;
    this.#tweak = tweak;
    this.#radix = radix;
    this.#alphabet = alphabet;
    this.#minLength = minLength;
    this.#maxLength = maxLength;
    this.#fpeClient = new FF1(
      key,
      tweak,
      radix,
      alphabet,
      minLength,
      maxLength,
    );
  }

  encode(dbId: DatabaseId): string {
    const obfuscatedId = this.obfuscate(dbId);
    const encoded = base62.encode(obfuscatedId);
    return encoded;
  }

  decode(shortCode: string): DatabaseId {
    const decoded = base62.decode(shortCode);
    const databaseId = this.deObfuscate(decoded);
    return databaseId;
  }

  obuscate(dbId: DatabaseId): number {
    return this.obfuscate(dbId);
  }

  deObuscate(obfuscatedId: number): number {
    return this.deObfuscate(obfuscatedId);
  }

  obfuscate(dbId: DatabaseId): number {
    const encrypted = this.#fpeClient.encrypt(String(dbId));
    return Number(encrypted);
  }

  deObfuscate(obfuscatedId: number): number {
    const decrypted = this.#fpeClient.decrypt(String(obfuscatedId));
    return Number(decrypted);
  }
}

export { BaseConversion as baseconversion };
