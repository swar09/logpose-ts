import { Request, Response, Router } from "express";

const urls_router = Router();

urls_router.post("/", createUrl);
urls_router.get("/qr", getUrlsQr);
urls_router.post("/public/shorten", shortenPublicUrl);
urls_router.get("/public/my-urls", getPublicMyUrls);
urls_router.get("/:short_code", getUrlByShortCode);
urls_router.post("/:short_code", updateUrlByShortCode);
urls_router.delete("/:short_code", deleteUrlByShortCode);
urls_router.get("/:short_code/analytics", getUrlAnalytics);
urls_router.get("/:short_code/qr", getUrlQrByShortCode);

async function createUrl(req: Request, res: Response) {
}

async function getUrlsQr(req: Request, res: Response) {
}

async function shortenPublicUrl(req: Request, res: Response) {
}

async function getPublicMyUrls(req: Request, res: Response) {
}

async function getUrlByShortCode(req: Request, res: Response) {
}

async function updateUrlByShortCode(req: Request, res: Response) {
}

async function deleteUrlByShortCode(req: Request, res: Response) {
}

async function getUrlAnalytics(req: Request, res: Response) {
}

async function getUrlQrByShortCode(req: Request, res: Response) {
}

export default urls_router;