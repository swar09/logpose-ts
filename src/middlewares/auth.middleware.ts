import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import {
  AuthHeaderSchema,
  Claims,
  ClaimsSchema,
  TokenStringSchema,
} from "../models/auth.model";
import { AuthRepository } from "../repositories/auth.repository";
import { RedisClient } from "../repositories/urls.repository";
import { verifySignature, verifyTokenSignature } from "../lib/jwt";

export type { RedisClient };
export { verifySignature, verifyTokenSignature };

declare global {
  namespace Express {
    interface Request {
      claims?: Claims;
    }
  }
}

export interface AuthMiddlewareOptions {
  secret?: string;
  redis?: RedisClient;
  authRepository?: AuthRepository;
  jtiKeyPrefix?: string;
}

export function createAuthMiddleware(options?: AuthMiddlewareOptions) {
  const secret = options?.secret ?? process.env.JWT_SECRET;
  const redis = options?.redis;
  const authRepo = options?.authRepository;
  const jtiPrefix = options?.jtiKeyPrefix ?? "bl:";

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const rawAuthHeader = req.headers.authorization;
      const authHeaderParsed = AuthHeaderSchema.safeParse(rawAuthHeader);

      if (!authHeaderParsed.success) {
        res.status(401).json({
          status: "error",
          message: "Missing or invalid Authorization header",
          errors: authHeaderParsed.error.issues,
        });
        return;
      }

      const token = authHeaderParsed.data.replace(/^Bearer\s+/i, "").trim();

      const tokenParsed = TokenStringSchema.safeParse(token);
      if (!tokenParsed.success) {
        res.status(401).json({
          status: "error",
          message: "Malformed token format",
          errors: tokenParsed.error.issues,
        });
        return;
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        res.status(401).json({
          status: "error",
          message: "Invalid token: must contain header, payload, and signature",
        });
        return;
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      if (secret) {
        const signatureValid = verifySignature(
          headerB64,
          payloadB64,
          signatureB64,
          secret,
        );

        if (!signatureValid) {
          res.status(401).json({
            status: "error",
            message: "Invalid token signature",
          });
          return;
        }
      }

      let rawPayload: unknown;
      try {
        const payloadJson = Buffer.from(payloadB64, "base64url").toString(
          "utf-8",
        );
        rawPayload = JSON.parse(payloadJson);
      } catch {
        res.status(401).json({
          status: "error",
          message: "Failed to decode token payload",
        });
        return;
      }

      const claimsResult = ClaimsSchema.safeParse(rawPayload);
      if (!claimsResult.success) {
        res.status(401).json({
          status: "error",
          message: "Token claims validation failed",
          errors: claimsResult.error.issues,
        });
        return;
      }

      const claims = claimsResult.data as Claims;
      const nowSeconds = Math.floor(Date.now() / 1000);

      if (claims.nbf && nowSeconds < claims.nbf) {
        res.status(401).json({
          status: "error",
          message: "Token is not active yet",
        });
        return;
      }

      if (claims.exp && nowSeconds >= claims.exp) {
        res.status(401).json({
          status: "error",
          message: "Token has expired",
        });
        return;
      }

      if (redis && claims.jti) {
        try {
          const blacklisted = await redis.get(`${jtiPrefix}${claims.jti}`);
          if (blacklisted !== null) {
            res.status(401).json({
              status: "error",
              message: "Token has been revoked",
            });
            return;
          }
        } catch (redisError) {
          console.error(
            `Redis error checking blacklisted JTI ${claims.jti}:`,
            redisError,
          );
        }
      } else if (authRepo && claims.jti) {
        const isBlacklisted = await authRepo.isJtiBlacklisted(claims.jti);
        if (isBlacklisted) {
          res.status(401).json({
            status: "error",
            message: "Token has been revoked",
          });
          return;
        }
      }

      req.claims = claims;
      res.locals.claims = claims;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(401).json({
          status: "error",
          message: "Validation error",
          errors: error.issues,
        });
        return;
      }
      next(error);
    }
  };
}

export const authMiddleware = createAuthMiddleware();

export default authMiddleware;
