import { Router } from "express";
import {
    createUrl,
    deleteUrlByShortCode,
    getPublicMyUrls,
    getUrlAnalytics,
    getUrlByShortCode,
    getUrlQrByShortCode,
    getUrlsQr,
    shortenPublicUrl,
    updateUrlByShortCode,
} from "../controllers/urls";

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

export default urls_router;