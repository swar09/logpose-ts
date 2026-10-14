import { Router } from "express";
import {
    cancelBillingSubscription,
    createBillingOrder,
    getBillingPlans,
    getBillingSubscription,
    verifyBillingPayment,
} from "../controllers/billing";

const billing_router = Router();

billing_router.get("/plans", getBillingPlans);
billing_router.post("/order", createBillingOrder);
billing_router.post("/verify", verifyBillingPayment);
billing_router.get("/subscription", getBillingSubscription);
billing_router.post("/cancel", cancelBillingSubscription);

export default billing_router;
