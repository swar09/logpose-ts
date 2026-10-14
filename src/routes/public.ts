import { Request, Response, Router } from "express";

const public_router = Router();

public_router.post("/shorten", publicShortenUrl);
public_router.get("/my-urls", getPublicUserUrls);
public_router.get("/qr", getPublicQrCode);

async function publicShortenUrl(req: Request, res: Response) {
}

async function getPublicUserUrls(req: Request, res: Response) {
}

async function getPublicQrCode(req: Request, res: Response) {
}

export default public_router;
