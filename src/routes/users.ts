import { Router } from "express";
import {
    deleteUserById,
    getUserById,
    getUserSubscription,
    getUserUrls,
    registerUser,
    updateUserById,
    updateUserPassword,
} from "../controllers/users";

const users_router = Router();

users_router.post("/", registerUser);
users_router.get("/:path_user_id", getUserById);
users_router.patch("/:path_user_id", updateUserById);
users_router.delete("/:path_user_id", deleteUserById);
users_router.get("/:path_user_id/urls", getUserUrls);
users_router.get("/:path_user_id/subscription", getUserSubscription);
users_router.patch("/:path_user_id/updatepassword", updateUserPassword);

export default users_router;
