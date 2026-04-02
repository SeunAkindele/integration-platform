import { Injectable, Logger } from "@nestjs/common";
import { WebhookValidatedEvent } from "../../../../libs/contracts/events/webhook-validated.event";
import { IntegrationAdapterResult } from "../types/integration-adapter-result";

@Injectable()
export class StripeAdapter {
  private readonly logger = new Logger(StripeAdapter.name);

  async handle(event: WebhookValidatedEvent): Promise<IntegrationAdapterResult> {
    const payload = this.toRecord(event.payload);

    const action = this.asString(payload?.type) || "stripe.unknown";
    const objectType =
      this.asString(payload?.data?.["object"]?.["object"]) || "unknown-object";
    const livemode =
      typeof payload?.livemode === "boolean" ? payload.livemode : null;

    this.logger.log(
      `Handling Stripe eventId=${event.eventId}, action=${action}, objectType=${objectType}`,
    );

    return {
      action,
      summary: `Stripe event processed for object ${objectType}`,
      data: {
        objectType,
        livemode,
      },
    };
  }

  private toRecord(payload: unknown): Record<string, any> {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { value: payload };
    }
    return payload as Record<string, any>;
  }

  private asString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
  }
}