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
      this.logger.warn(`No signature provided for provider=${provider}`);
      return true;
    }

    switch (p) {
      case WebhookProvider.STRIPE:
        return this.verifyStripeStub(rawBody, signature);

      case WebhookProvider.GITHUB:
        return this.verifyGithub(rawBody, signature);

      case WebhookProvider.SLACK:
        return this.verifySlack(rawBody, signature, context);

      default:
        this.logger.warn(`Unknown provider=${provider}, allowing for now`);
        return true;
    }
  }

  private verifyStripeStub(rawBody: string, signature: string): boolean {
    void rawBody;
    void signature;
    return true;
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
    const receivedAtMs = context.receivedAt ? Date.parse(context.receivedAt) : NaN;
    const referenceSeconds = Math.floor(
      (Number.isNaN(receivedAtMs) ? Date.now() : receivedAtMs) / 1000,
    );
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
