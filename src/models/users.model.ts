import { z } from "zod";
import { Url } from "./urls.model";

export enum UserRole {
  ADMIN,
  USER,
}
export type User = {
  user_id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role: UserRole;
  hashed_password: string;
  createdAt: Date;
  updatedAt: Date;
  urls: Url[];
};

export type UserResponse = {
  id: string;
  email: string;
  username: string;
  last_name: string;
  first_name: string;
  createdAt: Date;
  updatedAt: Date;
};

export const RegisterUserSchema = z.object({
  email: z.email("Invalid email address").toLowerCase().trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username must contain only letters, numbers, and underscores",
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name is required").max(50),
  last_name: z.string().min(1, "Last name is required").max(50),
});
export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>;

export const UpdateUserSchema = z.object({
  email: z.email("Invalid email address").toLowerCase().trim().optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  first_name: z.string().min(1).max(50).optional(),
  last_name: z.string().min(1).max(50).optional(),
});
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;

export const UpdatePasswordSchema = z.object({
  old_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
});
export type UpdatePasswordDTO = z.infer<typeof UpdatePasswordSchema>;

export const UserIdParamSchema = z.object({
  path_user_id: z.uuid("Invalid User ID format"),
});
export type UserIdParamDTO = z.infer<typeof UserIdParamSchema>;
