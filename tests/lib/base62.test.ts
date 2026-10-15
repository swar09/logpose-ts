import { describe, it, expect } from "vitest";
import { BaseConversion } from "../../src/lib/base62";

describe("BaseConversion (base62)", () => {
    // 128-bit AES hex key (32 hex characters = 16 bytes)
    const validKey = "2b7e151628aed2a6abf7158809cf4f3c";
    const validTweak = "";

    it("should instantiate successfully with valid key and tweak", () => {
        const converter = new BaseConversion(validKey, validTweak);
        expect(converter).toBeInstanceOf(BaseConversion);
    });

    describe("encode and decode", () => {
        it("should encode a database ID to a base62 string and decode back to the original ID", () => {
            const converter = new BaseConversion(validKey, validTweak);
            const originalId = 123456;

            const shortCode = converter.encode(originalId);
            expect(typeof shortCode).toBe("string");
            expect(shortCode.length).toBeGreaterThan(0);

            const decodedId = converter.decode(shortCode);
            expect(decodedId).toBe(originalId);
        });

        it("should produce different short codes for different database IDs", () => {
            const converter = new BaseConversion(validKey, validTweak);
            const code1 = converter.encode(100001);
            const code2 = converter.encode(100002);

            expect(code1).not.toBe(code2);
            expect(converter.decode(code1)).toBe(100001);
            expect(converter.decode(code2)).toBe(100002);
        });

        it("should correctly handle various number magnitudes (>= 2 digits)", () => {
            const converter = new BaseConversion(validKey, validTweak);
            const testIds = [10, 42, 999, 10000, 999999, 123456789];

            for (const id of testIds) {
                const encoded = converter.encode(id);
                const decoded = converter.decode(encoded);
                expect(decoded).toBe(id);
            }
        });
    });

    describe("obfuscate and deObfuscate", () => {
        it("should obfuscate a database ID and de-obfuscate back to original ID", () => {
            const converter = new BaseConversion(validKey, validTweak);
            const originalId = 987654;

            const obfuscated = converter.obfuscate(originalId);
            expect(typeof obfuscated).toBe("number");
            expect(obfuscated).not.toBe(originalId);

            const deobfuscated = converter.deObfuscate(obfuscated);
            expect(deobfuscated).toBe(originalId);
        });

        it("should support the legacy spelling aliases obuscate and deObuscate", () => {
            const converter = new BaseConversion(validKey, validTweak);
            const originalId = 555666;

            const obfuscated = converter.obuscate(originalId);
            expect(obfuscated).toBe(converter.obfuscate(originalId));

            const deobfuscated = converter.deObuscate(obfuscated);
            expect(deobfuscated).toBe(originalId);
        });
    });

    describe("edge cases & constraints", () => {
        it("should throw an error for single-digit numbers due to FF1 length constraints", () => {
            const converter = new BaseConversion(validKey, validTweak);
            expect(() => converter.encode(5)).toThrow(/Input length 1 is outside allowed range/);
        });

        it("should work with custom minLength and maxLength options", () => {
            const converter = new BaseConversion(validKey, validTweak, 10, "0123456789", 4, 10);
            const originalId = 54321;

            const encoded = converter.encode(originalId);
            expect(converter.decode(encoded)).toBe(originalId);
        });
    });
});
