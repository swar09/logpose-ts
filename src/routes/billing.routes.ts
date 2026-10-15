import { Router } from "express";
import {
  cancelBillingSubscription,
  createBillingOrder,
  getBillingPlans,
  getBillingSubscription,
  verifyBillingPayment,
} from "../controllers/billing.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  CancelSubscriptionSchema,
  CreateBillingOrderSchema,
  VerifyPaymentSchema,
} from "../models/billing.model";

export const billingRouter = Router();

billingRouter.get("/plans", getBillingPlans);
billingRouter.post(
  "/order",
  authMiddleware,
  validate({ body: CreateBillingOrderSchema }),
  createBillingOrder,
);
billingRouter.post(
  "/verify",
  authMiddleware,
  validate({ body: VerifyPaymentSchema }),
  verifyBillingPayment,
);
billingRouter.get("/subscription", authMiddleware, getBillingSubscription);
billingRouter.post(
  "/cancel",
  authMiddleware,
  validate({ body: CancelSubscriptionSchema }),
  cancelBillingSubscription,
);

export default billingRouter;
