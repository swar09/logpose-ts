import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  createRazorpayPaymentSignature,
  verifyRazorpayPaymentSignature,
  verifyRazorpaySubscriptionPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../../src/lib/razorpay";

describe("Razorpay Signature Helpers", () => {
  const testSecret = "test_key_secret_123456";
  const webhookSecret = "test_webhook_secret_789";

  it("should create and verify valid Razorpay payment signature", () => {
    const orderId = "order_O8w9j2Hqf7p2Lm";
    const paymentId = "pay_O8wAQG6B1Uv1Yg";

    const expectedSig = crypto
      .createHmac("sha256", testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const createdSig = createRazorpayPaymentSignature(
      orderId,
      paymentId,
      testSecret,
    );
    expect(createdSig).toBe(expectedSig);

    const isValid = verifyRazorpayPaymentSignature(
      orderId,
      paymentId,
      createdSig,
      testSecret,
    );
    expect(isValid).toBe(true);
  });

  it("should reject invalid payment signature", () => {
    const orderId = "order_O8w9j2Hqf7p2Lm";
    const paymentId = "pay_O8wAQG6B1Uv1Yg";
    const fakeSig = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    const isValid = verifyRazorpayPaymentSignature(
      orderId,
      paymentId,
      fakeSig,
      testSecret,
    );
    expect(isValid).toBe(false);
  });

  it("should verify valid subscription signature", () => {
    const subscriptionId = "sub_O8w9j2Hqf7p2Lm";
    const paymentId = "pay_O8wAQG6B1Uv1Yg";

    const expectedSig = crypto
      .createHmac("sha256", testSecret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");

    const isValid = verifyRazorpaySubscriptionPaymentSignature(
      subscriptionId,
      paymentId,
      expectedSig,
      testSecret,
    );
    expect(isValid).toBe(true);
  });

  it("should verify valid webhook signature using raw body", () => {
    const payload = JSON.stringify({
      entity: "event",
      event: "payment.captured",
      contains: ["payment"],
      payload: {
        payment: {
          entity: {
            id: "pay_123456",
            amount: 50000,
            currency: "INR",
          },
        },
      },
    });

    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    const isValid = verifyRazorpayWebhookSignature(
      payload,
      signature,
      webhookSecret,
    );
    expect(isValid).toBe(true);
  });

  it("should reject altered webhook body with original signature", () => {
    const originalPayload = JSON.stringify({ event: "payment.captured" });
    const tamperedPayload = JSON.stringify({ event: "payment.captured", hacked: true });

    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(originalPayload)
      .digest("hex");

    const isValid = verifyRazorpayWebhookSignature(
      tamperedPayload,
      signature,
      webhookSecret,
    );
    expect(isValid).toBe(false);
  });
});
