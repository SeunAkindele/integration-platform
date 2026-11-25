import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { WebhookProvider } from "@libs/common/enums/webhook-provider.enum";

export interface SignatureContext {
  /** Original request headers, forwarded by the gateway. */
  headers?: Record<string, string | string[] | undefined>;
  /** When the gateway received the request (ISO string). Used as "now" for replay checks. */
  receivedAt?: string;
}

/** Slack rejects requests whose timestamp is more than 5 minutes off. */
const SLACK_MAX_TIMESTAMP_SKEW_SECONDS = 60 * 5;

/** Stripe's default tolerance (matches the official SDK's constructEvent). */
const STRIPE_MAX_TIMESTAMP_SKEW_SECONDS = 60 * 5;

@Injectable()
export class SignatureVerificationService {
  private readonly logger = new Logger(SignatureVerificationService.name);

  verify(
    provider: string,
    rawBody: string,
    signature?: string | null,
    context: SignatureContext = {},
  ): boolean {
    const p = provider.toLowerCase();

    if (!signature) {
      if (p === WebhookProvider.GITHUB && process.env.GITHUB_WEBHOOK_SECRET) {
        this.logger.warn(
          "GitHub webhook: no x-hub-signature-256 while GITHUB_WEBHOOK_SECRET is set",
        );
        return false;
      }
      if (p === WebhookProvider.SLACK && process.env.SLACK_SIGNING_SECRET) {
        this.logger.warn(
          "Slack webhook: no x-slack-signature while SLACK_SIGNING_SECRET is set",
        );
        return false;
      }
      if (p === WebhookProvider.STRIPE && process.env.STRIPE_WEBHOOK_SECRET) {
        this.logger.warn(
          "Stripe webhook: no stripe-signature while STRIPE_WEBHOOK_SECRET is set",
        );
        return false;
      }
      this.logger.warn(`No signature provided for provider=${provider}`);
      return true;
    }

    switch (p) {
      case WebhookProvider.STRIPE:
        return this.verifyStripe(rawBody, signature, context);

      case WebhookProvider.GITHUB:
        return this.verifyGithub(rawBody, signature);

      case WebhookProvider.SLACK:
        return this.verifySlack(rawBody, signature, context);

      default:
        this.logger.warn(`Unknown provider=${provider}, allowing for now`);
        return true;
    }
  }

  /**
   * Stripe signing: https://docs.stripe.com/webhooks#verify-manually
   * Header: "t=<unix>,v1=<hex>[,v1=<hex>...][,v0=...]"
   * signature = HMAC-SHA256(endpointSecret, "{t}.{rawBody}"); any v1 may match
   * (Stripe sends several while an endpoint secret is being rolled).
   */
  private verifyStripe(
    rawBody: string,
    signature: string,
    context: SignatureContext,
  ): boolean {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return true;

    let timestamp: string | null = null;
    const candidates: string[] = [];
    for (const part of signature.split(",")) {
      const idx = part.indexOf("=");
      if (idx <= 0) continue;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key === "t") timestamp = value;
      else if (key === "v1" && value) candidates.push(value);
    }

    if (!timestamp || !/^\d+$/.test(timestamp)) {
      this.logger.warn("Stripe webhook: missing or invalid timestamp in stripe-signature");
      return false;
    }
    if (candidates.length === 0) {
      this.logger.warn("Stripe webhook: no v1 signature in stripe-signature");
      return false;
    }

    // Same replay window approach as Slack: measure against gateway receivedAt so
    // NATS redeliveries and DLQ replays of a genuine event still verify.
    const referenceSeconds = this.referenceSeconds(context);
    if (Math.abs(referenceSeconds - Number(timestamp)) > STRIPE_MAX_TIMESTAMP_SKEW_SECONDS) {
      this.logger.warn(
        `Stripe webhook: timestamp ${timestamp} is outside the ${STRIPE_MAX_TIMESTAMP_SKEW_SECONDS}s window`,
      );
      return false;
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const expectedBuf = Buffer.from(expected);

    return candidates.some((candidate) => {
      const candidateBuf = Buffer.from(candidate);
      return (
        candidateBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(candidateBuf, expectedBuf)
      );
    });
  }

  private verifyGithub(rawBody: string, signature: string): boolean {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return true;

    const expected = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex")}`;

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Slack signing: https://api.slack.com/authentication/verifying-requests-from-slack
   * signature = "v0=" + HMAC-SHA256(signingSecret, "v0:{timestamp}:{rawBody}")
   */
  private verifySlack(
    rawBody: string,
    signature: string,
    context: SignatureContext,
  ): boolean {
    const secret = process.env.SLACK_SIGNING_SECRET;
    if (!secret) return true;

    const timestamp = this.getHeader(context.headers, "x-slack-request-timestamp");
    if (!timestamp || !/^\d+$/.test(timestamp)) {
      this.logger.warn("Slack webhook: missing or invalid x-slack-request-timestamp");
      return false;
    }

    // Compare against when the gateway received the request, not "now", so NATS
    // redeliveries and DLQ replays of a genuine event still verify.
    const referenceSeconds = this.referenceSeconds(context);
    if (Math.abs(referenceSeconds - Number(timestamp)) > SLACK_MAX_TIMESTAMP_SKEW_SECONDS) {
      this.logger.warn(
        `Slack webhook: timestamp ${timestamp} is outside the ${SLACK_MAX_TIMESTAMP_SKEW_SECONDS}s window`,
      );
      return false;
    }

    const expected = `v0=${crypto
      .createHmac("sha256", secret)
      .update(`v0:${timestamp}:${rawBody}`)
      .digest("hex")}`;

    const expectedBuf = Buffer.from(expected);
    const signatureBuf = Buffer.from(signature);
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  }

  /** "Now" for replay checks: when the gateway received the request, else the clock. */
  private referenceSeconds(context: SignatureContext): number {
    const receivedAtMs = context.receivedAt ? Date.parse(context.receivedAt) : NaN;
    return Math.floor((Number.isNaN(receivedAtMs) ? Date.now() : receivedAtMs) / 1000);
  }

  private getHeader(
    headers: SignatureContext["headers"],
    name: string,
  ): string | null {
    if (!headers) return null;
    const value = headers[name.toLowerCase()] ?? headers[name];
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }
}
