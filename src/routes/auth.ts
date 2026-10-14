import { Request, Response, Router } from "express";

const auth_router = Router();

auth_router.post("/login", loginUser);
auth_router.post("/logout", logoutUser);
auth_router.post("/signup", signupUser);
auth_router.get("/google", googleAuth);
auth_router.get("/google/callback", googleAuthCallback);

async function loginUser(req: Request, res: Response) {
}

async function logoutUser(req: Request, res: Response) {
}

async function signupUser(req: Request, res: Response) {
}

async function googleAuth(req: Request, res: Response) {
}

async function googleAuthCallback(req: Request, res: Response) {
}

export default auth_router;
