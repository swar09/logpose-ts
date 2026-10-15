import { describe, it, expect } from "vitest";
import {
  createSignature,
  signToken,
  verifySignature,
  verifyTokenSignature,
} from "../../src/lib/jwt";

describe("JWT Signature Verification (src/lib/jwt.ts)", () => {
  const secret = "my-secure-production-secret-key-32-bytes!";
  const testHeader = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const testPayload = Buffer.from(
    JSON.stringify({ sub: "user-123", role: "USER" }),
  ).toString("base64url");

  describe("createSignature", () => {
    it("should create deterministic base64url HMAC-SHA256 signature", () => {
      const sig1 = createSignature(testHeader, testPayload, secret);
      const sig2 = createSignature(testHeader, testPayload, secret);

      expect(typeof sig1).toBe("string");
      expect(sig1.length).toBeGreaterThan(0);
      expect(sig1).toBe(sig2);
      expect(sig1).not.toContain("+");
      expect(sig1).not.toContain("/");
      expect(sig1).not.toContain("=");
    });
  });

  describe("verifySignature", () => {
    it("should return true when header, payload, signature, and secret match", () => {
      const validSignature = createSignature(testHeader, testPayload, secret);
      const isValid = verifySignature(
        testHeader,
        testPayload,
        validSignature,
        secret,
      );

      expect(isValid).toBe(true);
    });

    it("should return false when a different secret is provided", () => {
      const validSignature = createSignature(testHeader, testPayload, secret);
      const isValid = verifySignature(
        testHeader,
        testPayload,
        validSignature,
        "wrong-secret-key",
      );

      expect(isValid).toBe(false);
    });

    it("should return false when payload is tampered", () => {
      const validSignature = createSignature(testHeader, testPayload, secret);
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: "user-123", role: "ADMIN" }),
      ).toString("base64url");
      const isValid = verifySignature(
        testHeader,
        tamperedPayload,
        validSignature,
        secret,
      );

      expect(isValid).toBe(false);
    });

    it("should return false when header is tampered", () => {
      const validSignature = createSignature(testHeader, testPayload, secret);
      const tamperedHeader = Buffer.from(
        JSON.stringify({ alg: "none", typ: "JWT" }),
      ).toString("base64url");
      const isValid = verifySignature(
        tamperedHeader,
        testPayload,
        validSignature,
        secret,
      );

      expect(isValid).toBe(false);
    });

    it("should return false when signature characters are altered", () => {
      const validSignature = createSignature(testHeader, testPayload, secret);
      const alteredSig =
        validSignature.slice(0, -1) +
        (validSignature.slice(-1) === "a" ? "b" : "a");
      const isValid = verifySignature(
        testHeader,
        testPayload,
        alteredSig,
        secret,
      );

      expect(isValid).toBe(false);
    });

    it("should return false when signature length does not match expected length", () => {
      const shortSignature = "too-short";
      const isValid = verifySignature(
        testHeader,
        testPayload,
        shortSignature,
        secret,
      );

      expect(isValid).toBe(false);
    });

    it("should return false when any required argument is empty", () => {
      const validSignature = createSignature(testHeader, testPayload, secret);

      expect(verifySignature("", testPayload, validSignature, secret)).toBe(
        false,
      );
      expect(verifySignature(testHeader, "", validSignature, secret)).toBe(
        false,
      );
      expect(verifySignature(testHeader, testPayload, "", secret)).toBe(false);
      expect(verifySignature(testHeader, testPayload, validSignature, "")).toBe(
        false,
      );
    });
  });

  describe("verifyTokenSignature", () => {
    it("should return true for a correctly signed 3-part token", () => {
      const validSignature = createSignature(testHeader, testPayload, secret);
      const token = `${testHeader}.${testPayload}.${validSignature}`;

      expect(verifyTokenSignature(token, secret)).toBe(true);
    });

    it("should return false for tokens with invalid signature", () => {
      const token = `${testHeader}.${testPayload}.invalid-signature-value`;

      expect(verifyTokenSignature(token, secret)).toBe(false);
    });

    it("should return false for tokens without 3 parts", () => {
      expect(verifyTokenSignature(`${testHeader}.${testPayload}`, secret)).toBe(
        false,
      );
      expect(verifyTokenSignature(`part1.part2.part3.part4`, secret)).toBe(
        false,
      );
      expect(verifyTokenSignature("not-a-token", secret)).toBe(false);
      expect(verifyTokenSignature("", secret)).toBe(false);
    });
  });

  describe("signToken", () => {
    it("should generate a complete token that verifies successfully with verifyTokenSignature", () => {
      const token = signToken({ sub: "user-456", exp: 1234567890 }, secret);
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);

      const isValid = verifyTokenSignature(token, secret);
      expect(isValid).toBe(true);
    });
  });
});
