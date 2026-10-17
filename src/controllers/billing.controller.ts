import { Request, Response } from "express";
import { billingRepo } from "../repositories";
import { razorpayService } from "../services/razorpay.service";
import { verifyRazorpayPaymentSignature } from "../lib/razorpay";
import { razorpayConfig } from "../config";
import { PaymentStatus, SubscriptionStatus } from "../generated/prisma/enums";

export async function getBillingPlans(req: Request, res: Response) {
  try {
    const plans = await billingRepo.getActivePlans();
    return res.status(200).json({
      status: "success",
      data: plans,
    });
  } catch (error: any) {
    console.error("Error fetching billing plans:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch plans",
    });
  }
}

export async function createBillingOrder(req: Request, res: Response) {
  try {
    const userId = req.claims?.sub;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const { plan_id } = req.body;
    const plan = await billingRepo.getPlanById(plan_id);

    if (!plan || !plan.is_active) {
      return res.status(404).json({
        status: "error",
        message: "Plan not found or inactive",
      });
    }

    const amountInSubunit = plan.amount;
    const currency = "INR";
    const receipt = `rcpt_${Date.now()}_${userId.slice(0, 6)}`;

    const razorpayOrder = await razorpayService.createOrder({
      amount: amountInSubunit,
      currency,
      receipt,
      notes: {
        userId,
        planId: String(plan.id),
      },
    });

    const payment = await billingRepo.createPayment({
      userId,
      planId: plan.id,
      subscriptionId: "",
      amount: plan.amount,
      status: PaymentStatus.CREATED,
      razorpayOrderID: razorpayOrder.id,
      razorpayPaymentID: "",
      razorpaySignature: "",
    });

    return res.status(201).json({
      status: "success",
      data: {
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: razorpayConfig.keyId,
        payment_id: payment.id,
      },
    });
  } catch (error: any) {
    console.error("Error creating billing order:", error);
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to create billing order",
    });
  }
}

export async function verifyBillingPayment(req: Request, res: Response) {
  try {
    const userId = req.claims?.sub;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const payment = await billingRepo.getPaymentByOrderId(razorpay_order_id);
    if (!payment) {
      return res.status(404).json({
        status: "error",
        message: "Payment order not found",
      });
    }

    if (payment.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: Order does not belong to user",
      });
    }

    const isValid = verifyRazorpayPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    if (!isValid) {
      await billingRepo.updatePaymentStatus(payment.id, PaymentStatus.FAILED, {
        errorCode: "SIGNATURE_VERIFICATION_FAILED",
        errorDescription: "Client payment signature verification failed",
        razorpayPaymentID: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });

      return res.status(400).json({
        status: "error",
        message: "Invalid payment signature",
      });
    }

    const updatedPayment = await billingRepo.updatePaymentStatus(
      payment.id,
      PaymentStatus.SUCCESSFUL,
      {
        razorpayPaymentID: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
    );

    return res.status(200).json({
      status: "success",
      message: "Payment verified successfully",
      data: updatedPayment,
    });
  } catch (error: any) {
    console.error("Error verifying billing payment:", error);
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Payment verification failed",
    });
  }
}

export async function getBillingSubscription(req: Request, res: Response) {
  try {
    const userId = req.claims?.sub;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const subscription = await billingRepo.getSubscriptionByUserId(userId);
    return res.status(200).json({
      status: "success",
      data: subscription,
    });
  } catch (error: any) {
    console.error("Error fetching billing subscription:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch subscription",
    });
  }
}

export async function cancelBillingSubscription(req: Request, res: Response) {
  try {
    const userId = req.claims?.sub;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const { subscription_id } = req.body;
    const subscription =
      await billingRepo.getSubscriptionByRazorpaySubscriptionId(
        subscription_id,
      );

    if (!subscription || subscription.userId !== userId) {
      return res.status(404).json({
        status: "error",
        message: "Subscription not found",
      });
    }

    if (subscription.razorpaySubscriptionID) {
      try {
        await razorpayService.cancelSubscription(
          subscription.razorpaySubscriptionID,
          false,
        );
      } catch (err) {
        console.warn("Failed to cancel subscription on Razorpay API:", err);
      }
    }

    const updated = await billingRepo.updateSubscriptionStatus(
      subscription.id,
      SubscriptionStatus.INACTIVE,
    );

    return res.status(200).json({
      status: "success",
      message: "Subscription cancelled successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error cancelling billing subscription:", error);
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to cancel subscription",
    });
  }
}
