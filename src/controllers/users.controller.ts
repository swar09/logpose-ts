import { Request, Response } from "express";
import {
  RegisterUserDTO,
  UpdatePasswordDTO,
  UpdateUserDTO,
  UserIdParamDTO,
  UserRole,
} from "../models/users.model";
import { billingRepo, urlRepo, userRepo } from "../repositories";
import { Prisma } from "../generated/prisma/client";
import { hasher } from "../lib/argon2";

export interface PaginationQuery {
  page?: string;
  pageSize?: string;
}

export function canAccessUserData(
  req: Request<any, any, any, any>,
  targetUserId: string,
): boolean {
  if (!req.claims) return false;
  const isAdmin =
    req.claims.role === UserRole.ADMIN ||
    (req.claims.role as unknown) === "ADMIN";
  return isAdmin || req.claims.sub === targetUserId;
}

export async function registerUser(
  req: Request<Record<string, never>, unknown, RegisterUserDTO>,
  res: Response,
) {
  try {
    const { email, username, password, first_name, last_name } = req.body;

    const userExistsByEmail = await userRepo.getByEmail(email);
    if (userExistsByEmail) {
      return res.status(409).json({
        status: "error",
        message: "User for this email id already exists",
        mail: email,
      });
    }

    const userExistsByUsername = await userRepo.getByUsername(username);
    if (userExistsByUsername) {
      return res.status(409).json({
        status: "error",
        message: "Username is already taken",
      });
    }

    const hashed_password = await hasher.hash(password);
    const userCreateInput: Prisma.UserCreateInput = {
      first_name,
      last_name,
      email,
      username,
      hashed_password,
    };

    const result = await userRepo.create(userCreateInput);
    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    console.error("Failed to register user:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function getUserById(req: Request<UserIdParamDTO>, res: Response) {
  try {
    const userId = req.params.path_user_id;

    if (!canAccessUserData(req, userId)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: You are not authorized to view this user",
      });
    }

    const result = await userRepo.getById(userId);

    if (!result) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      user: result,
    });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function updateUserById(
  req: Request<UserIdParamDTO, unknown, UpdateUserDTO>,
  res: Response,
) {
  try {
    const { path_user_id } = req.params;

    if (!canAccessUserData(req, path_user_id)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: You are not authorized to update this user",
      });
    }

    const updateData = req.body;

    const existingUser = await userRepo.getById(path_user_id);
    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    if (updateData.email && updateData.email !== existingUser.email) {
      const emailTaken = await userRepo.getByEmail(updateData.email);
      if (emailTaken) {
        return res.status(409).json({
          status: "error",
          message: "Email is already taken",
        });
      }
    }

    if (updateData.username && updateData.username !== existingUser.username) {
      const usernameTaken = await userRepo.getByUsername(updateData.username);
      if (usernameTaken) {
        return res.status(409).json({
          status: "error",
          message: "Username is already taken",
        });
      }
    }

    const updatedUser = await userRepo.updateUserInfo(path_user_id, updateData);
    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function deleteUserById(
  req: Request<UserIdParamDTO>,
  res: Response,
) {
  try {
    const { path_user_id } = req.params;

    if (!canAccessUserData(req, path_user_id)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: You are not authorized to delete this user",
      });
    }

    const existingUser = await userRepo.getById(path_user_id);
    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    await userRepo.deleteById(path_user_id);
    return res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function getUserUrls(
  req: Request<UserIdParamDTO, unknown, unknown, PaginationQuery>,
  res: Response,
) {
  try {
    const { path_user_id } = req.params;

    if (!canAccessUserData(req, path_user_id)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: You are not authorized to view this user's URLs",
      });
    }

    const user = await userRepo.getById(path_user_id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const page = req.query.page ? Math.max(1, parseInt(req.query.page, 10) || 1) : 1;
    const pageSize = req.query.pageSize ? Math.max(1, parseInt(req.query.pageSize, 10) || 20) : 20;

    const urls = await urlRepo.getUrlsByUserId(path_user_id, page, pageSize);
    return res.status(200).json({
      status: "success",
      data: urls,
      pagination: {
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error("Failed to fetch user URLs:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function getUserSubscription(
  req: Request<UserIdParamDTO>,
  res: Response,
) {
  try {
    const { path_user_id } = req.params;

    if (!canAccessUserData(req, path_user_id)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: You are not authorized to view this user's subscription",
      });
    }

    const user = await userRepo.getById(path_user_id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const subscription = await billingRepo.getSubscriptionByUserId(path_user_id);
    return res.status(200).json({
      status: "success",
      subscription: subscription ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch user subscription:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function updateUserPassword(
  req: Request<UserIdParamDTO, unknown, UpdatePasswordDTO>,
  res: Response,
) {
  try {
    const { path_user_id } = req.params;

    if (!canAccessUserData(req, path_user_id)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: You are not authorized to update this user's password",
      });
    }

    const { old_password, new_password } = req.body;

    const currentHashedPassword = await userRepo.getHashedPassword(path_user_id);
    if (!currentHashedPassword) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const isMatch = await hasher.verify(old_password, currentHashedPassword);
    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "Current password does not match",
      });
    }

    const newHashedPassword = await hasher.hash(new_password);
    await userRepo.updatePassword(path_user_id, newHashedPassword);

    return res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Failed to update password:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}
