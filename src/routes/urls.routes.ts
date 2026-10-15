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
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  CreateUrlSchema,
  PublicShortenUrlSchema,
  ShortCodeParamSchema,
  UpdateUrlSchema,
} from "../models/urls.model";

export const urlsRouter = Router();

urlsRouter.post(
  "/",
  authMiddleware,
  validate({ body: CreateUrlSchema }),
  createUrl,
);
urlsRouter.get("/qr", authMiddleware, getUrlsQr);
urlsRouter.post(
  "/public/shorten",
  validate({ body: PublicShortenUrlSchema }),
  shortenPublicUrl,
);
urlsRouter.get("/public/my-urls", getPublicMyUrls);
urlsRouter.get(
  "/:short_code",
  authMiddleware,
  validate({ params: ShortCodeParamSchema }),
  getUrlByShortCode,
);
urlsRouter.post(
  "/:short_code",
  authMiddleware,
  validate({ params: ShortCodeParamSchema, body: UpdateUrlSchema }),
  updateUrlByShortCode,
);
urlsRouter.delete(
  "/:short_code",
  authMiddleware,
  validate({ params: ShortCodeParamSchema }),
  deleteUrlByShortCode,
);
urlsRouter.get(
  "/:short_code/analytics",
  authMiddleware,
  validate({ params: ShortCodeParamSchema }),
  getUrlAnalytics,
);
urlsRouter.get(
  "/:short_code/qr",
  authMiddleware,
  validate({ params: ShortCodeParamSchema }),
  getUrlQrByShortCode,
);

export default urlsRouter;
