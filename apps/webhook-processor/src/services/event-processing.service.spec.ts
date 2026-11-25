import { EventProcessingService } from "./event-processing.service";
import { SignatureVerificationService } from "./signature-verification.service";
import { IdempotencyService } from "./idempotency.service";
import { WebhookEventStoreService } from "./webhook-event-store.service";
import { Publisher } from "@libs/messaging/publisher";
import { WebhookReceivedEvent } from "@libs/contracts/events/webhook-received.event";
import { SUBJECTS } from "@libs/contracts/subjects";

const event: WebhookReceivedEvent = {
  eventId: "stripe:evt_1",
  provider: "stripe",
  path: "/webhooks/stripe",
  method: "POST",
  headers: {},
  query: {},
  rawBody: '{"id":"evt_1"}',
  sourceIp: "127.0.0.1",
  receivedAt: "2026-11-25T10:00:00.000Z",
  parsedBody: { id: "evt_1" },
  signature: "t=1,v1=abc",
};

function setup(opts: { processed?: boolean; stored?: boolean; valid?: boolean }) {
  const signature = { verify: jest.fn().mockReturnValue(opts.valid ?? true) };
  const idempotency = {
    hasBeenProcessed: jest.fn().mockResolvedValue(opts.processed ?? false),
    markProcessed: jest.fn().mockResolvedValue(undefined),
  };
  const store = {
    exists: jest.fn().mockResolvedValue(opts.stored ?? false),
    saveReceivedEvent: jest.fn().mockResolvedValue(undefined),
    refreshReceivedEvent: jest.fn().mockResolvedValue(undefined),
    markValidated: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
  };
  const publisher = { publish: jest.fn().mockResolvedValue(undefined) };

  const service = new EventProcessingService(
    signature as unknown as SignatureVerificationService,
    idempotency as unknown as IdempotencyService,
    store as unknown as WebhookEventStoreService,
    publisher as unknown as Publisher,
  );
  return { service, signature, idempotency, store, publisher };
}

describe("EventProcessingService", () => {
  it("validates and publishes a new event", async () => {
    const { service, store, publisher, idempotency } = setup({});
    await service.handleReceivedEvent(event);

    expect(store.saveReceivedEvent).toHaveBeenCalledWith(event);
    expect(publisher.publish).toHaveBeenCalledWith(
      SUBJECTS.WEBHOOK_VALIDATED_V1,
      expect.objectContaining({ eventId: "stripe:evt_1", payload: { id: "evt_1" } }),
    );
    expect(idempotency.markProcessed).toHaveBeenCalledWith(
      "stripe:evt_1",
      "stripe",
      "processed",
      expect.any(String),
    );
  });

  it("skips a provider retry of an already processed event", async () => {
    const { service, signature, publisher } = setup({ processed: true });
    await service.handleReceivedEvent(event);

    expect(signature.verify).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it("refreshes the stored row when a retry follows an earlier failed delivery", async () => {
    const { service, store, publisher } = setup({ stored: true });
    await service.handleReceivedEvent(event);

    expect(store.refreshReceivedEvent).toHaveBeenCalledWith(event);
    expect(store.saveReceivedEvent).not.toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });

  it("records a bad signature without throwing (acked, not retried) and does not publish", async () => {
    const { service, store, idempotency, publisher } = setup({ valid: false });
    await expect(service.handleReceivedEvent(event)).resolves.toBeUndefined();

    expect(store.markFailed).toHaveBeenCalledWith("stripe:evt_1", "Signature verification failed");
    expect(idempotency.markProcessed).toHaveBeenCalledWith(
      "stripe:evt_1",
      "stripe",
      "failed",
      "Signature verification failed",
    );
    expect(publisher.publish).not.toHaveBeenCalled();
  });
});
