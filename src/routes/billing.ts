import { Request, Response, Router } from "express";

const billing_router = Router();

billing_router.get("/plans", getBillingPlans);
billing_router.post("/order", createBillingOrder);
billing_router.post("/verify", verifyBillingPayment);
billing_router.get("/subscription", getBillingSubscription);
billing_router.post("/cancel", cancelBillingSubscription);

async function getBillingPlans(req: Request, res: Response) {
}

async function createBillingOrder(req: Request, res: Response) {
}

async function verifyBillingPayment(req: Request, res: Response) {
}

async function getBillingSubscription(req: Request, res: Response) {
}

async function cancelBillingSubscription(req: Request, res: Response) {
}

export default billing_router;
