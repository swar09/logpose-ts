import { Router } from "express";
import { handleRazorpayWebhook } from "../controllers/webhooks";

const webhooks_router = Router();

webhooks_router.post("/razorpay", handleRazorpayWebhook);

export default webhooks_router;
