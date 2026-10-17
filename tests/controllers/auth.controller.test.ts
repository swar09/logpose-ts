import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginUser,
  signupUser,
  logoutUser,
  googleAuth,
  googleAuthCallback,
} from "../../src/controllers/auth.controller";
import { authRepo, userRepo } from "../../src/repositories";
import { UserRole } from "../../src/models/users.model";
import { googleConfig } from "../../src/config";

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    locals: {},
  };
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((data: any) => {
    res.data = data;
    return res;
  });
  res.redirect = vi.fn().mockImplementation((url: string) => {
    res.redirectUrl = url;
    return res;
  });
  return res;
}

describe("auth.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loginUser", () => {
    it("should return 401 if password verification fails", async () => {
      vi.spyOn(authRepo, "verifyPasswordByLoginId").mockResolvedValue({
        success: false,
      });

      const req: any = {
        body: { loginId: "testuser", password: "wrongpassword" },
      };
      const res = createMockResponse();

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          message: "Invalid login credentials",
        }),
      );
    });

    it("should return 200 with JWT token on valid credentials", async () => {
      const mockUserId = "11111111-1111-1111-1111-111111111111";
      vi.spyOn(authRepo, "verifyPasswordByLoginId").mockResolvedValue({
        success: true,
        userId: mockUserId,
      });
      vi.spyOn(userRepo, "getById").mockResolvedValue({
        id: mockUserId,
        email: "test@example.com",
        username: "testuser",
        first_name: "Test",
        last_name: "User",
        role: "USER" as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req: any = {
        body: { loginId: "testuser", password: "correctpassword" },
      };
      const res = createMockResponse();

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.data).toMatchObject({
        status: "success",
        message: "Login successful",
        data: expect.objectContaining({
          token: expect.any(String),
          tokenType: "Bearer",
          expiresIn: expect.any(Number),
        }),
      });
    });
  });

  describe("signupUser", () => {
    it("should return 409 if email is already taken", async () => {
      vi.spyOn(userRepo, "getByEmail").mockResolvedValue({
        id: "1",
        email: "exists@example.com",
        username: "existing",
        first_name: "John",
        last_name: "Doe",
        role: "USER" as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req: any = {
        body: {
          email: "exists@example.com",
          username: "newuser",
          password: "password123",
          first_name: "John",
          last_name: "Doe",
        },
      };
      const res = createMockResponse();

      await signupUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.data.message).toContain("email already exists");
    });

    it("should return 201 and create user on valid registration", async () => {
      const mockUserId = "22222222-2222-2222-2222-222222222222";
      vi.spyOn(userRepo, "getByEmail").mockResolvedValue(null);
      vi.spyOn(userRepo, "getByUsername").mockResolvedValue(null);
      vi.spyOn(authRepo, "hashPassword").mockResolvedValue("hashed_pw");
      vi.spyOn(userRepo, "create").mockResolvedValue({
        id: mockUserId,
        email: "new@example.com",
        username: "newuser",
        first_name: "Jane",
        last_name: "Doe",
        role: "USER" as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req: any = {
        body: {
          email: "new@example.com",
          username: "newuser",
          password: "password123",
          first_name: "Jane",
          last_name: "Doe",
        },
      };
      const res = createMockResponse();

      await signupUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.data.status).toBe("success");
      expect(res.data.data.token).toBeDefined();
      expect(res.data.data.user.email).toBe("new@example.com");
    });
  });

  describe("logoutUser", () => {
    it("should blacklist JTI and return 200", async () => {
      const blacklistSpy = vi.spyOn(authRepo, "blacklistJti").mockResolvedValue();

      const req: any = {
        headers: { authorization: "Bearer some.jwt.token" },
        claims: {
          sub: "123",
          jti: "test-jti-uuid",
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        body: {},
      };
      const res = createMockResponse();

      await logoutUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(blacklistSpy).toHaveBeenCalledWith("test-jti-uuid", expect.any(Number));
    });
  });

  describe("googleAuth", () => {
    it("should return 501 if Google OAuth is not configured", async () => {
      googleConfig.clientId = "";
      googleConfig.redirectUri = "";
      const req: any = { headers: {}, query: {} };
      const res = createMockResponse();

      await googleAuth(req, res);

      expect(res.status).toHaveBeenCalledWith(501);
    });

    it("should redirect to Google auth URL if configured", async () => {
      googleConfig.clientId = "test-client-id";
      googleConfig.redirectUri = "http://localhost:3000/api/v1/auth/google/callback";

      const req: any = { headers: {}, query: {} };
      const res = createMockResponse();

      await googleAuth(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("https://accounts.google.com/o/oauth2/v2/auth"),
      );
    });
  });
});
