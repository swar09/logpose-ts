import crypto from "node:crypto";
import { Request, Response } from "express";
import {
  Claims,
  GoogleAuthCallbackQueryDTO,
  LoginData,
  LoginDTO,
  LogoutDTO,
} from "../models/auth.model";
import { RegisterUserDTO, UserRole } from "../models/users.model";
import { authRepo, userRepo } from "../repositories";
import { UserWithoutPassword } from "../repositories/users.repository";
import { createAuthToken, toModelUserRole } from "../lib/jwt";
import { googleConfig } from "../config";

/**
 * Standard API Response Structures
 */
export interface AuthSuccessResponse<T = unknown> {
  status: "success";
  message: string;
  data?: T;
}

export interface AuthErrorResponse {
  status: "error";
  message: string;
  errors?: unknown;
}

export type AuthResponse<T = unknown> =
  | AuthSuccessResponse<T>
  | AuthErrorResponse;

export interface SignupResponseData {
  user: UserWithoutPassword;
  token: string;
  tokenType: string;
  expiresIn: number;
}

export interface GoogleAuthQuery {
  redirect_uri?: string;
  state?: string;
}

export interface GoogleAuthUrlResponseData {
  url: string;
}

export interface GoogleCallbackResponseData {
  user: UserWithoutPassword;
  token: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * POST /api/v1/auth/login
 * Authenticates user credentials and issues a signed JWT token
 */
export async function loginUser(
  req: Request<
    Record<string, never>,
    AuthResponse<LoginData>,
    LoginDTO,
    Record<string, never>
  >,
  res: Response<AuthResponse<LoginData>>,
): Promise<Response<AuthResponse<LoginData>>> {
  try {
    const { loginId, password } = req.body;

    const verification = await authRepo.verifyPasswordByLoginId(
      loginId,
      password,
    );
    if (!verification.success || !verification.userId) {
      return res.status(401).json({
        status: "error",
        message: "Invalid login credentials",
      });
    }

    const user = await userRepo.getById(verification.userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User account not found",
      });
    }

    const { token, expiresIn } = createAuthToken(user);
    const role = toModelUserRole(user.role);

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: role,
        token,
        tokenType: "Bearer",
        expiresIn,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error during login",
    });
  }
}

/**
 * POST /api/v1/auth/signup
 * Registers a new user account, hashes password with Argon2, and returns an authenticated session
 */
export async function signupUser(
  req: Request<
    Record<string, never>,
    AuthResponse<SignupResponseData>,
    RegisterUserDTO,
    Record<string, never>
  >,
  res: Response<AuthResponse<SignupResponseData>>,
): Promise<Response<AuthResponse<SignupResponseData>>> {
  try {
    const { email, username, password, first_name, last_name } = req.body;

    const userExistsByEmail = await userRepo.getByEmail(email);
    if (userExistsByEmail) {
      return res.status(409).json({
        status: "error",
        message: "User with this email already exists",
      });
    }

    const userExistsByUsername = await userRepo.getByUsername(username);
    if (userExistsByUsername) {
      return res.status(409).json({
        status: "error",
        message: "Username is already taken",
      });
    }

    const hashed_password = await authRepo.hashPassword(password);

    const user = await userRepo.create({
      first_name,
      last_name,
      email,
      username,
      hashed_password,
    });

    const { token, expiresIn } = createAuthToken(user);

    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        user,
        token,
        tokenType: "Bearer",
        expiresIn,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error during signup",
    });
  }
}

/**
 * POST /api/v1/auth/logout
 * Revokes current session by blacklisting token JTI in Redis / memory
 */
export async function logoutUser(
  req: Request<
    Record<string, never>,
    AuthResponse,
    LogoutDTO,
    Record<string, never>
  >,
  res: Response<AuthResponse>,
): Promise<Response<AuthResponse>> {
  try {
    if (req.claims?.jti) {
      const now = Math.floor(Date.now() / 1000);
      const remainingTime = Math.max(0, (req.claims.exp || now) - now);
      await authRepo.blacklistJti(req.claims.jti, remainingTime);
    }

    const rawAuthHeader = req.headers.authorization;
    const tokenFromHeader = rawAuthHeader?.replace(/^Bearer\s+/i, "").trim();
    const token = tokenFromHeader || req.body?.token;

    if (token) {
      await authRepo.blacklistToken(token);
    }

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error during logout",
    });
  }
}

/**
 * GET /api/v1/auth/google
 * Initiates Google OAuth 2.0 flow
 */
export async function googleAuth(
  req: Request<
    Record<string, never>,
    AuthResponse<GoogleAuthUrlResponseData>,
    unknown,
    GoogleAuthQuery
  >,
  res: Response<AuthResponse<GoogleAuthUrlResponseData>>,
): Promise<void | Response<AuthResponse<GoogleAuthUrlResponseData>>> {
  try {
    const clientId = googleConfig.clientId;
    const redirectUri = req.query.redirect_uri || googleConfig.redirectUri;

    if (!clientId || !redirectUri) {
      return res.status(501).json({
        status: "error",
        message:
          "Google OAuth is not configured on this server. Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI.",
      });
    }

    const state = req.query.state || crypto.randomUUID();
    const scope = encodeURIComponent("openid email profile");
    const encodedRedirectUri = encodeURIComponent(redirectUri);

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

    if (req.headers.accept?.includes("application/json")) {
      return res.status(200).json({
        status: "success",
        message: "Google OAuth URL generated",
        data: { url: googleAuthUrl },
      });
    }

    return res.redirect(googleAuthUrl);
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error during Google auth initiation",
    });
  }
}

/**
 * GET /api/v1/auth/google/callback
 * Handles Google OAuth callback, verifies tokens, auto-provisions user, and returns JWT
 */
export async function googleAuthCallback(
  req: Request<
    Record<string, never>,
    AuthResponse<GoogleCallbackResponseData>,
    unknown,
    GoogleAuthCallbackQueryDTO
  >,
  res: Response<AuthResponse<GoogleCallbackResponseData>>,
): Promise<Response<AuthResponse<GoogleCallbackResponseData>>> {
  try {
    const { code } = req.query;

    if (!googleConfig.isConfigured) {
      return res.status(501).json({
        status: "error",
        message:
          "Google OAuth is not configured on this server. Missing credentials.",
      });
    }

    const { clientId, clientSecret, redirectUri } = googleConfig;

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Google token exchange failed:", errText);
      return res.status(401).json({
        status: "error",
        message: "Failed to exchange Google authorization code",
      });
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      id_token?: string;
    };

    // Fetch user profile from Google UserInfo endpoint
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );

    if (!userInfoResponse.ok) {
      return res.status(401).json({
        status: "error",
        message: "Failed to fetch user profile from Google",
      });
    }

    const googleUser = (await userInfoResponse.json()) as {
      sub: string;
      email: string;
      email_verified?: boolean;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    if (!googleUser.email) {
      return res.status(400).json({
        status: "error",
        message: "Google account does not provide an email address",
      });
    }

    // Find existing user or auto-provision
    let user = await userRepo.getByEmail(googleUser.email);
    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashed_password = await authRepo.hashPassword(randomPassword);

      const baseUsername = googleUser.email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9_]/g, "_");
      let uniqueUsername = baseUsername;
      const existingUserByUsername = await userRepo.getByUsername(uniqueUsername);
      if (existingUserByUsername) {
        uniqueUsername = `${baseUsername}_${crypto.randomBytes(3).toString("hex")}`;
      }

      user = await userRepo.create({
        email: googleUser.email,
        username: uniqueUsername,
        first_name: googleUser.given_name || googleUser.name || "Google",
        last_name: googleUser.family_name || "User",
        hashed_password,
      });
    }

    const { token, expiresIn } = createAuthToken(user);

    return res.status(200).json({
      status: "success",
      message: "Google authentication successful",
      data: {
        user,
        token,
        tokenType: "Bearer",
        expiresIn,
      },
    });
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error during Google OAuth callback",
    });
  }
}
