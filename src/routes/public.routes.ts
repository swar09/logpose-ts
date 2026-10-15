import { Router } from "express";
import {
  getPublicQrCode,
  getPublicUserUrls,
  publicShortenUrl,
} from "../controllers/public.controller";
import { validate } from "../middlewares/validate.middleware";
import { PublicShortenUrlSchema } from "../models/urls.model";

export const publicRouter = Router();

publicRouter.post(
  "/shorten",
  validate({ body: PublicShortenUrlSchema }),
  publicShortenUrl,
);
publicRouter.get("/my-urls", getPublicUserUrls);
publicRouter.get("/qr", getPublicQrCode);

export default publicRouter;
