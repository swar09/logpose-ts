import { Router } from "express";
import { handleRazorpayWebhook } from "../controllers/webhooks.controller";
import { validate } from "../middlewares/validate.middleware";
import { RazorpayWebhookSchema } from "../models/billing.model";

export const webhooksRouter = Router();

webhooksRouter.post(
  "/razorpay",
  validate({ body: RazorpayWebhookSchema }),
  handleRazorpayWebhook,
);

export default webhooksRouter;
