import { Request, Response, Router } from "express";

const users_router = Router();

users_router.post("/", registerUser);
users_router.get("/:path_user_id", getUserById);
users_router.patch("/:path_user_id", updateUserById);
users_router.delete("/:path_user_id", deleteUserById);
users_router.get("/:path_user_id/urls", getUserUrls);
users_router.get("/:path_user_id/subscription", getUserSubscription);
users_router.patch("/:path_user_id/updatepassword", updateUserPassword);

async function registerUser(req: Request, res: Response) {
}

async function getUserById(req: Request, res: Response) {
}

async function updateUserById(req: Request, res: Response) {
}

async function deleteUserById(req: Request, res: Response) {
}

async function getUserUrls(req: Request, res: Response) {
}

async function getUserSubscription(req: Request, res: Response) {
}

async function updateUserPassword(req: Request, res: Response) {
}

export default users_router;
