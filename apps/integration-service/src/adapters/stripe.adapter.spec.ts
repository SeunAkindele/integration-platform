import { StripeAdapter } from "./stripe.adapter";
import { WebhookValidatedEvent } from "@libs/contracts/events/webhook-validated.event";

function validated(payload: unknown): WebhookValidatedEvent {
  return {
    eventId: "stripe:evt_test_1",
    provider: "stripe",
    receivedAt: "2026-11-25T10:00:00.000Z",
    validatedAt: "2026-11-25T10:00:01.000Z",
    payload,
  } as WebhookValidatedEvent;
}

describe("StripeAdapter", () => {
  const adapter = new StripeAdapter();

  it("extracts payment_intent.succeeded fields", async () => {
    const result = await adapter.handle(
      validated({
        id: "evt_test_1",
        object: "event",
        api_version: "2025-10-29.clover",
        created: 1764064800,
        livemode: false,
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_123",
            object: "payment_intent",
            amount: 5000,
            currency: "usd",
            customer: "cus_456",
            status: "succeeded",
          },
        },
      }),
    );

    expect(result.action).toBe("payment_intent.succeeded");
    expect(result.summary).toBe("Stripe payment_intent.succeeded for payment_intent pi_123");
    expect(result.data).toEqual({
      stripeEventId: "evt_test_1",
      objectType: "payment_intent",
      objectId: "pi_123",
      livemode: false,
      account: null,
      apiVersion: "2025-10-29.clover",
      created: 1764064800,
      amount: 5000,
      currency: "usd",
      customer: "cus_456",
      status: "succeeded",
    });
  });

  it("reads the connected account and an expanded customer", async () => {
    const result = await adapter.handle(
      validated({
        id: "evt_2",
        type: "charge.succeeded",
        account: "acct_connected",
        data: { object: { id: "ch_1", object: "charge", customer: { id: "cus_x" } } },
      }),
    );

    expect(result.data).toMatchObject({ account: "acct_connected", customer: "cus_x" });
  });

  it("falls back safely on an unexpected payload", async () => {
    const result = await adapter.handle(validated("not-an-object"));

    expect(result.action).toBe("stripe.unknown");
    expect(result.summary).toBe("Stripe event processed for object unknown-object");
    expect(result.data).toMatchObject({ stripeEventId: null, objectId: null, amount: null });
  });
});
