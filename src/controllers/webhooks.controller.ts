import { Request, Response } from "express";
import { billingRepo } from "../repositories";
import { verifyRazorpayWebhookSignature } from "../lib/razorpay";
import { razorpayConfig } from "../config";
import { PaymentStatus, SubscriptionStatus } from "../generated/prisma/enums";

export async function handleRazorpayWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;

    if (!signature) {
      return res.status(400).json({
        status: "error",
        message: "Missing x-razorpay-signature header",
      });
    }

    const rawBody: Buffer | string =
      (req as any).rawBody || JSON.stringify(req.body);

    const isValid = verifyRazorpayWebhookSignature(
      rawBody,
      signature,
      razorpayConfig.webhookSecret,
    );

    if (!isValid) {
      console.warn("[Razorpay Webhook] Invalid webhook signature received");
      return res.status(400).json({
        status: "error",
        message: "Invalid webhook signature",
      });
    }

    const { event, payload } = req.body;
    const eventId =
      (req.headers["x-razorpay-event-id"] as string) ||
      `${event}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const existingEvent = await billingRepo.getWebhookEventByEventId(eventId);
    if (existingEvent && existingEvent.status === "COMPLETED") {
      return res.status(200).json({
        status: "success",
        message: "Event already processed",
      });
    }

    const recordedEvent = await billingRepo.recordWebhookEvent(
      eventId,
      event,
      [JSON.stringify(payload)],
    );

    try {
      switch (event) {
        case "payment.captured":
        case "order.paid": {
          const paymentEntity = payload?.payment?.entity;
          const orderEntity = payload?.order?.entity;
          const orderId = paymentEntity?.order_id || orderEntity?.id;

          if (orderId) {
            const paymentRecord = await billingRepo.getPaymentByOrderId(orderId);
            if (paymentRecord) {
              await billingRepo.updatePaymentStatus(
                paymentRecord.id,
                PaymentStatus.SUCCESSFUL,
                {
                  razorpayPaymentID: paymentEntity?.id,
                },
              );
            }
          }
          break;
        }

        case "payment.failed": {
          const paymentEntity = payload?.payment?.entity;
          const orderId = paymentEntity?.order_id;

          if (orderId) {
            const paymentRecord = await billingRepo.getPaymentByOrderId(orderId);
            if (paymentRecord) {
              await billingRepo.updatePaymentStatus(
                paymentRecord.id,
                PaymentStatus.FAILED,
                {
                  errorCode: paymentEntity?.error_code || "PAYMENT_FAILED",
                  errorDescription:
                    paymentEntity?.error_description || "Payment failed",
                  razorpayPaymentID: paymentEntity?.id,
                },
              );
            }
          }
          break;
        }

        case "subscription.activated":
        case "subscription.charged": {
          const subEntity = payload?.subscription?.entity;
          if (subEntity?.id) {
            const existingSub =
              await billingRepo.getSubscriptionByRazorpaySubscriptionId(
                subEntity.id,
              );
            if (existingSub) {
              await billingRepo.updateSubscription(existingSub.id, {
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: subEntity.current_start
                  ? new Date(subEntity.current_start * 1000)
                  : existingSub.currentPeriodStart,
                currentPeriodEnd: subEntity.current_end
                  ? new Date(subEntity.current_end * 1000)
                  : existingSub.currentPeriodEnd,
              });
            }
          }
          break;
        }

        case "subscription.halted": {
          const subEntity = payload?.subscription?.entity;
          if (subEntity?.id) {
            const existingSub =
              await billingRepo.getSubscriptionByRazorpaySubscriptionId(
                subEntity.id,
              );
            if (existingSub) {
              await billingRepo.updateSubscriptionStatus(
                existingSub.id,
                SubscriptionStatus.HOLD,
              );
            }
          }
          break;
        }

        case "subscription.cancelled": {
          const subEntity = payload?.subscription?.entity;
          if (subEntity?.id) {
            const existingSub =
              await billingRepo.getSubscriptionByRazorpaySubscriptionId(
                subEntity.id,
              );
            if (existingSub) {
              await billingRepo.updateSubscriptionStatus(
                existingSub.id,
                SubscriptionStatus.INACTIVE,
              );
            }
          }
          break;
        }

        default:
          console.log(`[Razorpay Webhook] Unhandled event type: ${event}`);
      }

      await billingRepo.markWebhookProcessed(recordedEvent.id, "COMPLETED");
    } catch (processError: any) {
      console.error(
        `[Razorpay Webhook] Processing error for event ${eventId}:`,
        processError,
      );
      await billingRepo.markWebhookProcessed(
        recordedEvent.id,
        "FAILED",
        processError.message,
      );
    }

    return res.status(200).json({
      status: "success",
      message: "Webhook processed",
    });
  } catch (error: any) {
    console.error("Unhandled webhook controller error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error while processing webhook",
    });
  }
}
