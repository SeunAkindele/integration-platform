import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { WebhookProvider } from "@libs/common/enums/webhook-provider.enum";

@Injectable()
export class SignatureVerificationService {
  private readonly logger = new Logger(SignatureVerificationService.name);

  verify(provider: string, rawBody: string, signature?: string | null): boolean {
    const p = provider.toLowerCase();

    if (!signature) {
      if (p === WebhookProvider.GITHUB && process.env.GITHUB_WEBHOOK_SECRET) {
        this.logger.warn(
          "GitHub webhook: no x-hub-signature-256 while GITHUB_WEBHOOK_SECRET is set",
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
        return this.verifyGithubStub(rawBody, signature);

      case WebhookProvider.SLACK:
        return this.verifySlackStub(rawBody, signature);

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

  private verifyGithubStub(rawBody: string, signature: string): boolean {
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

  private verifySlackStub(rawBody: string, signature: string): boolean {
    void rawBody;
    void signature;
    return true;
  }
}
