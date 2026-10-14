import { Router } from "express";
import {
    getPublicQrCode,
    getPublicUserUrls,
    publicShortenUrl,
} from "../controllers/public";

const public_router = Router();

public_router.post("/shorten", publicShortenUrl);
public_router.get("/my-urls", getPublicUserUrls);
public_router.get("/qr", getPublicQrCode);

export default public_router;
