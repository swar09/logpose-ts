import { z } from "zod";
import { UserRole } from "./users.model";

export type LoginData = {
  user: UserRole;
  token: string;
  tokenType: string;
  expiresIn: number; // secs
};

export type LoginResponse = {
  data?: LoginData;
  success: boolean;
};

export const LoginSchema = z.object({
  loginId: z.string().min(3, "Login ID must be at least 3 characters").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginDTO = z.infer<typeof LoginSchema>;

export const GoogleAuthCallbackQuerySchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().optional(),
});
export type GoogleAuthCallbackQueryDTO = z.infer<
  typeof GoogleAuthCallbackQuerySchema
>;

export const LogoutSchema = z.object({
  token: z.string().optional(),
});
export type LogoutDTO = z.infer<typeof LogoutSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});
export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;

export const UserRoleSchema = z.union([
  z.enum(UserRole),
  z
    .enum(["ADMIN", "USER"])
    .transform((val) => (val === "ADMIN" ? UserRole.ADMIN : UserRole.USER)),
]);

export interface Claims {
  sub: string; // Uuid: subject (issued to)
  iat: number; // u64: time of assignment
  nbf: number; // u64: time before token is not valid
  exp: number; // u64: time after which token is not valid
  role: UserRole; // UserRole: user role
  jti: string; // Uuid: token id for jwt blocking purposes
  iss?: string; // issuer (multiple services can assign tokens)
  aud?: string; // audience (services where token is intended to be used)
}

export const ClaimsSchema = z.object({
  sub: z.uuid("Claim 'sub' must be a valid UUID"),
  iat: z
    .number()
    .int()
    .nonnegative("Claim 'iat' must be a non-negative timestamp"),
  nbf: z
    .number()
    .int()
    .nonnegative("Claim 'nbf' must be a non-negative timestamp"),
  exp: z.number().int().positive("Claim 'exp' must be a positive timestamp"),
  role: UserRoleSchema,
  jti: z.uuid("Claim 'jti' must be a valid UUID"),
  iss: z.string().optional(),
  aud: z.string().optional(),
});
export type ClaimsDTO = z.infer<typeof ClaimsSchema>;

export const AuthHeaderSchema = z
  .string("Authorization header is required")
  .regex(/^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i, {
    message: "Authorization header must be in 'Bearer <token>' format",
  });

export const TokenStringSchema = z
  .string()
  .min(1, "Token string is required")
  .regex(
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    "Token must be a valid 3-part JWT",
  );
