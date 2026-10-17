import crypto from "node:crypto";
import { razorpayConfig } from "../config";

export function createRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  secret: string = razorpayConfig.keySecret,
): string {
  const payload = `${orderId}|${paymentId}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  receivedSignature: string,
  secret: string = razorpayConfig.keySecret,
): boolean {
  if (!orderId || !paymentId || !receivedSignature || !secret) {
    return false;
  }

  try {
    const expectedSignature = createRazorpayPaymentSignature(
      orderId,
      paymentId,
      secret,
    );

    const receivedBuf = Buffer.from(receivedSignature, "utf-8");
    const expectedBuf = Buffer.from(expectedSignature, "utf-8");

    if (receivedBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function verifyRazorpaySubscriptionPaymentSignature(
  subscriptionId: string,
  paymentId: string,
  receivedSignature: string,
  secret: string = razorpayConfig.keySecret,
): boolean {
  if (!subscriptionId || !paymentId || !receivedSignature || !secret) {
    return false;
  }

  try {
    const payload = `${paymentId}|${subscriptionId}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const receivedBuf = Buffer.from(receivedSignature, "utf-8");
    const expectedBuf = Buffer.from(expectedSignature, "utf-8");

    if (receivedBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function verifyRazorpayWebhookSignature(
  rawBody: string | Buffer,
  receivedSignature: string,
  secret: string = razorpayConfig.webhookSecret,
): boolean {
  if (!rawBody || !receivedSignature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const receivedBuf = Buffer.from(receivedSignature, "utf-8");
    const expectedBuf = Buffer.from(expectedSignature, "utf-8");

    if (receivedBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}
