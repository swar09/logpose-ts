import { Router } from "express";
import {
    googleAuth,
    googleAuthCallback,
    loginUser,
    logoutUser,
    signupUser,
} from "../controllers/auth";

const auth_router = Router();

auth_router.post("/login", loginUser);
auth_router.post("/logout", logoutUser);
auth_router.post("/signup", signupUser);
auth_router.get("/google", googleAuth);
auth_router.get("/google/callback", googleAuthCallback);

export default auth_router;
