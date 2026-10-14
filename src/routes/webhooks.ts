import { Request, Response, Router } from "express";

const webhooks_router = Router();

webhooks_router.post("/razorpay", handleRazorpayWebhook);

async function handleRazorpayWebhook(req: Request, res: Response) {
}

export default webhooks_router;
