import { Injectable, Logger } from "@nestjs/common";
import { WebhookValidatedEvent } from "@libs/contracts/events/webhook-validated.event";
import { IntegrationAdapterResult } from "../types/integration-adapter-result";

@Injectable()
export class StripeAdapter {
  private readonly logger = new Logger(StripeAdapter.name);

  async handle(event: WebhookValidatedEvent): Promise<IntegrationAdapterResult> {
    // Stripe event envelope: { id: "evt_...", type: "payment_intent.succeeded",
    //   data: { object: { object: "payment_intent", id: "pi_...", ... } }, livemode, account? }
    const payload = this.toRecord(event.payload);
    const object = this.toRecord(this.toRecord(payload?.data)?.object);

    const action = this.asString(payload?.type) || "stripe.unknown";
    const stripeEventId = this.asString(payload?.id);
    const objectType = this.asString(object?.object) || "unknown-object";
    const objectId = this.asString(object?.id);
    const livemode =
      typeof payload?.livemode === "boolean" ? payload.livemode : null;
    // Only present on events delivered for a connected account (Stripe Connect).
    const account = this.asString(payload?.account);
    const apiVersion = this.asString(payload?.api_version);
    const created = typeof payload?.created === "number" ? payload.created : null;

    const amount = typeof object?.amount === "number" ? object.amount : null;
    const currency = this.asString(object?.currency);
    // customer is an id string unless the event payload expanded it to an object.
    const customer =
      this.asString(object?.customer) ||
      this.asString(this.toRecord(object?.customer)?.id);
    const status = this.asString(object?.status);

    this.logger.log(
      `Handling Stripe eventId=${event.eventId}, action=${action}, stripeEventId=${stripeEventId}, object=${objectType}:${objectId}`,
    );

    return {
      action,
      summary: objectId
        ? `Stripe ${action} for ${objectType} ${objectId}`
        : `Stripe event processed for object ${objectType}`,
      data: {
        stripeEventId,
        objectType,
        objectId,
        livemode,
        account,
        apiVersion,
        created,
        amount,
        currency,
        customer,
        status,
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
