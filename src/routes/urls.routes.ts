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
} from "../controllers/urls.controller";
import { validate } from "../middlewares/validate.middleware";
import {
    CreateUrlSchema,
    PublicShortenUrlSchema,
    ShortCodeParamSchema,
    UpdateUrlSchema,
} from "../models/urls.model";

export const urlsRouter = Router();

urlsRouter.post("/", validate({ body: CreateUrlSchema }), createUrl);
urlsRouter.get("/qr", getUrlsQr);
urlsRouter.post("/public/shorten", validate({ body: PublicShortenUrlSchema }), shortenPublicUrl);
urlsRouter.get("/public/my-urls", getPublicMyUrls);
urlsRouter.get("/:short_code", validate({ params: ShortCodeParamSchema }), getUrlByShortCode);
urlsRouter.post("/:short_code", validate({ params: ShortCodeParamSchema, body: UpdateUrlSchema }), updateUrlByShortCode);
urlsRouter.delete("/:short_code", validate({ params: ShortCodeParamSchema }), deleteUrlByShortCode);
urlsRouter.get("/:short_code/analytics", validate({ params: ShortCodeParamSchema }), getUrlAnalytics);
urlsRouter.get("/:short_code/qr", validate({ params: ShortCodeParamSchema }), getUrlQrByShortCode);

export default urlsRouter;