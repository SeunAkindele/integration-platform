import { WebhookService } from "./webhook.service";
import { Publisher } from "@libs/messaging/publisher";
import { AcceptWebhookInput } from "../interfaces/accept-webhook.input";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function input(overrides: Partial<AcceptWebhookInput>): AcceptWebhookInput {
  return {
    provider: "stripe",
    path: "/webhooks/stripe",
    method: "POST",
    headers: {},
    query: {},
    rawBody: "{}",
    sourceIp: "127.0.0.1",
    ...overrides,
  } as AcceptWebhookInput;
}

describe("WebhookService eventId", () => {
  const publish = jest.fn().mockResolvedValue(undefined);
  const service = new WebhookService({ publish } as unknown as Publisher);

  beforeEach(() => publish.mockClear());

  it("uses the Stripe event id, so retries of one event share an eventId", async () => {
    const body = JSON.stringify({ id: "evt_1ABC", type: "payment_intent.succeeded" });
    const first = await service.acceptWebhook(input({ rawBody: body }));
    const retry = await service.acceptWebhook(input({ rawBody: body }));

    expect(first.eventId).toBe("stripe:evt_1ABC");
    expect(retry.eventId).toBe(first.eventId);
  });

  it("uses Slack's event_id", async () => {
    const body = JSON.stringify({ type: "event_callback", event_id: "Ev08ABC" });
    const result = await service.acceptWebhook(input({ provider: "slack", rawBody: body }));
    expect(result.eventId).toBe("slack:Ev08ABC");
  });

  it("uses GitHub's x-github-delivery header", async () => {
    const result = await service.acceptWebhook(
      input({
        provider: "github",
        headers: { "x-github-delivery": "72d3162e-cc78-11e3-81ab-4c9367dc0958" },
      }),
    );
    expect(result.eventId).toBe("github:72d3162e-cc78-11e3-81ab-4c9367dc0958");
  });

  it("falls back to a random UUID when the provider id is missing", async () => {
    const result = await service.acceptWebhook(input({ rawBody: "{}" }));
    expect(result.eventId).toMatch(UUID);
  });

  it("falls back to a random UUID when the provider id has unsafe characters", async () => {
    const body = JSON.stringify({ id: "evt 1; drop table" });
    const result = await service.acceptWebhook(input({ rawBody: body }));
    expect(result.eventId).toMatch(UUID);
  });

  it("forwards the stripe-signature header", async () => {
    await service.acceptWebhook(
      input({ headers: { "stripe-signature": "t=1,v1=abc" }, rawBody: '{"id":"evt_1"}' }),
    );
    expect(publish).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signature: "t=1,v1=abc", eventId: "stripe:evt_1" }),
    );
  });
});
