import crypto from "node:crypto";
import { jwtConfig } from "../config";
import { Claims } from "../models/auth.model";
import { UserRole } from "../models/users.model";

/**
 * Creates an HMAC-SHA256 signature encoded as base64url
 */
export function createSignature(
  headerB64: string,
  payloadB64: string,
  secret: string,
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");
}

/**
 * Timing-safe signature verification for base64url encoded parts
 */
export function verifySignature(
  headerB64: string,
  payloadB64: string,
  signatureB64: string,
  secret: string,
): boolean {
  if (!headerB64 || !payloadB64 || !signatureB64 || !secret) {
    return false;
  }

  try {
    const expectedSignature = createSignature(headerB64, payloadB64, secret);

    if (signatureB64.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signatureB64),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}

/**
 * Validates the HMAC-SHA256 signature of a 3-part JWT
 */
export function verifyTokenSignature(token: string, secret: string): boolean {
  if (!token || !secret) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  return verifySignature(parts[0], parts[1], parts[2], secret);
}

/**
 * Signs a payload and header using HMAC-SHA256
 */
export function signToken(
  payload: Record<string, unknown>,
  secret: string,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
): string {
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signatureB64 = createSignature(headerB64, payloadB64, secret);
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Decodes the JSON payload from a JWT without validating its signature
 */
export function decodeTokenPayload<T = Record<string, unknown>>(
  token: string,
): T | null {
  if (!token || typeof token !== "string") {
    return null;
  }
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const jsonStr = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Safely normalizes string, enum, or arbitrary role inputs to UserRole
 */
export function toModelUserRole(role: unknown): UserRole {
  if (role === "ADMIN" || role === UserRole.ADMIN) {
    return UserRole.ADMIN;
  }
  return UserRole.USER;
}

/**
 * Extracts JTI (UUID) and remaining valid seconds from a token payload
 * (Useful for token blacklisting in Redis)
 */
export function extractTokenJtiAndRemainingTime(
  token: string,
): { jti: string; remainingTime: number } | null {
  const payload = decodeTokenPayload<{ jti?: string; exp?: number }>(token);
  if (!payload || !payload.jti || typeof payload.exp !== "number") {
    return null;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  const remainingTime = Math.max(0, payload.exp - nowSeconds);
  return { jti: payload.jti, remainingTime };
}

/**
 * Generates a signed JWT with full Claims compliant with ClaimsSchema
 */
export function createAuthToken(
  user: { id: string; role?: unknown },
  expiresInSeconds: number = jwtConfig.expiresInSeconds,
  secret: string = jwtConfig.secret,
): { token: string; expiresIn: number; claims: Claims } {
  const now = Math.floor(Date.now() / 1000);
  const role = toModelUserRole(user.role);

  const claims: Claims = {
    sub: user.id,
    iat: now,
    nbf: now,
    exp: now + expiresInSeconds,
    role,
    jti: crypto.randomUUID(),
    iss: jwtConfig.issuer,
  };

  const token = signToken(claims as unknown as Record<string, unknown>, secret);
  return { token, expiresIn: expiresInSeconds, claims };
}

/**
 * Verifies signature and decodes token payload
 */
export function verifyAndDecodeToken<T = Claims>(
  token: string,
  secret: string,
): { valid: boolean; payload?: T; error?: string } {
  if (!verifyTokenSignature(token, secret)) {
    return { valid: false, error: "Invalid signature or malformed token" };
  }

  const payload = decodeTokenPayload<T>(token);
  if (!payload) {
    return { valid: false, error: "Failed to decode payload" };
  }

  return { valid: true, payload };
}
