import crypto from "node:crypto";

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
