import { Router } from "express";
import {
    cancelBillingSubscription,
    createBillingOrder,
    getBillingPlans,
    getBillingSubscription,
    verifyBillingPayment,
} from "../controllers/billing.controller";
import { validate } from "../middlewares/validate.middleware";
import {
    CancelSubscriptionSchema,
    CreateBillingOrderSchema,
    VerifyPaymentSchema,
} from "../models/billing.model";

export const billingRouter = Router();

billingRouter.get("/plans", getBillingPlans);
billingRouter.post("/order", validate({ body: CreateBillingOrderSchema }), createBillingOrder);
billingRouter.post("/verify", validate({ body: VerifyPaymentSchema }), verifyBillingPayment);
billingRouter.get("/subscription", getBillingSubscription);
billingRouter.post("/cancel", validate({ body: CancelSubscriptionSchema }), cancelBillingSubscription);

export default billingRouter;
