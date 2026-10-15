import { z } from "zod";
import { UserRole } from "./users.model";

export type LoginData = {
    user: UserRole,
    token: string,
    tokenType: string,
    expiresIn: number, // secs  
}

export type LoginResponse = {
    data?: LoginData;
    success: boolean;
    sucess?: boolean; // deprecated spelling alias
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
export type GoogleAuthCallbackQueryDTO = z.infer<typeof GoogleAuthCallbackQuerySchema>; 

export const LogoutSchema = z.object({
    token: z.string().optional(),
});
export type LogoutDTO = z.infer<typeof LogoutSchema>;

export const RefreshTokenSchema = z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
});
export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;

