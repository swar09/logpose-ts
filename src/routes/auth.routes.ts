import { Router } from "express";
import {
  googleAuth,
  googleAuthCallback,
  loginUser,
  logoutUser,
  signupUser,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  GoogleAuthCallbackQuerySchema,
  LoginSchema,
} from "../models/auth.model";
import { RegisterUserSchema } from "../models/users.model";

export const authRouter = Router();

authRouter.post("/login", validate({ body: LoginSchema }), loginUser);
authRouter.post("/logout", authMiddleware, logoutUser);
authRouter.post("/signup", validate({ body: RegisterUserSchema }), signupUser);
authRouter.get("/google", googleAuth);
authRouter.get(
  "/google/callback",
  validate({ query: GoogleAuthCallbackQuerySchema }),
  googleAuthCallback,
);

export default authRouter;
