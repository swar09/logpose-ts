import crypto from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthMiddleware } from "../../src/middlewares/auth.middleware";
import { Claims } from "../../src/models/auth.model";
import { UserRole } from "../../src/models/users.model";

describe("authMiddleware", () => {
  const testSecret = "test-jwt-secret-key-32-chars-long!";

  function createToken(claims: Partial<Claims>, secret?: string): string {
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");

    if (secret) {
      const signature = crypto
        .createHmac("sha256", secret)
        .update(`${header}.${payload}`)
        .digest("base64url");
      return `${header}.${payload}.${signature}`;
    }

    return `${header}.${payload}.unsigned`;
  }

  function createMockResponse() {
    const res: any = {
      statusCode: 200,
      locals: {},
    };
    res.status = vi.fn().mockImplementation((code: number) => {
      res.statusCode = code;
      return res;
    });
    res.json = vi.fn().mockReturnValue(res);
    return res;
  }

  it("should reject requests without Authorization header with 401", async () => {
    const middleware = createAuthMiddleware({ secret: testSecret });
    const req: any = { headers: {} };
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: "Missing or invalid Authorization header",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject invalid Authorization header format (not Bearer <token>) with 401", async () => {
    const middleware = createAuthMiddleware({ secret: testSecret });
    const req: any = { headers: { authorization: "Basic dXNlcjpwYXNz" } };
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: "Missing or invalid Authorization header",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject token with invalid signature with 401", async () => {
    const middleware = createAuthMiddleware({ secret: testSecret });
    const validClaims: Claims = {
      sub: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000) - 10,
      nbf: Math.floor(Date.now() / 1000) - 10,
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: UserRole.USER,
      jti: crypto.randomUUID(),
    };

    // Signed with a different secret
    const token = createToken(validClaims, "wrong-secret-key-wrong-secret!");
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: "Invalid token signature",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject expired tokens with 401", async () => {
    const middleware = createAuthMiddleware({ secret: testSecret });
    const expiredClaims: Claims = {
      sub: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000) - 7200,
      nbf: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      role: UserRole.USER,
      jti: crypto.randomUUID(),
    };

    const token = createToken(expiredClaims, testSecret);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: "Token has expired",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject tokens that are not active yet (nbf in future) with 401", async () => {
    const middleware = createAuthMiddleware({ secret: testSecret });
    const futureClaims: Claims = {
      sub: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000) + 1000, // Valid only in future
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: UserRole.USER,
      jti: crypto.randomUUID(),
    };

    const token = createToken(futureClaims, testSecret);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: "Token is not active yet",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject tokens with missing or invalid claims structure with 401", async () => {
    const middleware = createAuthMiddleware({ secret: testSecret });
    // Missing required 'jti' and invalid 'sub' (not a UUID)
    const invalidClaims = {
      sub: "not-a-uuid",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: "INVALID_ROLE",
    };

    const token = createToken(invalidClaims, testSecret);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: "Token claims validation failed",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject revoked/blacklisted tokens when AuthRepository detects blacklisted JTI", async () => {
    const mockAuthRepo: any = {
      isJtiBlacklisted: vi.fn().mockResolvedValue(true),
    };

    const middleware = createAuthMiddleware({
      secret: testSecret,
      authRepository: mockAuthRepo,
    });
    const validClaims: Claims = {
      sub: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000) - 10,
      nbf: Math.floor(Date.now() / 1000) - 10,
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: UserRole.USER,
      jti: crypto.randomUUID(),
    };

    const token = createToken(validClaims, testSecret);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(mockAuthRepo.isJtiBlacklisted).toHaveBeenCalledWith(validClaims.jti);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: "Token has been revoked",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should successfully extract claims, attach to req.claims, and call next() on valid token", async () => {
    const mockAuthRepo: any = {
      isJtiBlacklisted: vi.fn().mockResolvedValue(false),
    };

    const middleware = createAuthMiddleware({
      secret: testSecret,
      authRepository: mockAuthRepo,
    });
    const validClaims: Claims = {
      sub: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000) - 10,
      nbf: Math.floor(Date.now() / 1000) - 10,
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: UserRole.ADMIN,
      jti: crypto.randomUUID(),
    };

    const token = createToken(validClaims, testSecret);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.claims).toEqual(expect.objectContaining(validClaims));
    expect(res.locals.claims).toEqual(expect.objectContaining(validClaims));
  });

  describe("RedisClient blacklisting checks", () => {
    it("should reject token when Redis returns non-null for bl:<jti>", async () => {
      const mockRedis: any = {
        get: vi.fn().mockResolvedValue("true"),
      };

      const middleware = createAuthMiddleware({
        secret: testSecret,
        redis: mockRedis,
      });
      const validClaims: Claims = {
        sub: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000) - 10,
        nbf: Math.floor(Date.now() / 1000) - 10,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: UserRole.USER,
        jti: crypto.randomUUID(),
      };

      const token = createToken(validClaims, testSecret);
      const req: any = { headers: { authorization: `Bearer ${token}` } };
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(mockRedis.get).toHaveBeenCalledWith(`bl:${validClaims.jti}`);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          message: "Token has been revoked",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should NOT query Redis if claims validation fails first", async () => {
      const mockRedis: any = {
        get: vi.fn().mockResolvedValue("true"),
      };

      const middleware = createAuthMiddleware({
        secret: testSecret,
        redis: mockRedis,
      });
      const invalidClaims = {
        sub: "not-a-valid-uuid", // Fails Zod claims validation
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: "USER",
        jti: crypto.randomUUID(),
      };

      const token = createToken(invalidClaims as any, testSecret);
      const req: any = { headers: { authorization: `Bearer ${token}` } };
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      // Verify Redis was never called because validation failed prior to the blacklist check
      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should allow request and attach claims when Redis returns null", async () => {
      const mockRedis: any = {
        get: vi.fn().mockResolvedValue(null),
      };

      const middleware = createAuthMiddleware({
        secret: testSecret,
        redis: mockRedis,
      });
      const validClaims: Claims = {
        sub: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000) - 10,
        nbf: Math.floor(Date.now() / 1000) - 10,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: UserRole.USER,
        jti: crypto.randomUUID(),
      };

      const token = createToken(validClaims, testSecret);
      const req: any = { headers: { authorization: `Bearer ${token}` } };
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(mockRedis.get).toHaveBeenCalledWith(`bl:${validClaims.jti}`);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.claims).toEqual(expect.objectContaining(validClaims));
    });
  });
});
