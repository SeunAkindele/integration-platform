import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { WebhookController } from "./webhook.controller";
import { WebhookService } from "../services/webhook.service";
import { Publisher } from "@libs/messaging/publisher";

/**
 * HTTP-level test of POST /webhooks/stripe with the real controller and WebhookService,
 * and only the NATS publisher mocked (no NATS or Postgres needed).
 */
describe("POST /webhooks/stripe", () => {
  let app: INestApplication;
  const publish = jest.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [WebhookService, { provide: Publisher, useValue: { publish } }],
    }).compile();

    // Same option as apps/api-gateway/src/main.ts.
    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => publish.mockClear());

  it("accepts a signed Stripe event with 202 and forwards the exact raw bytes", async () => {
    // Deliberately unusual spacing: re-serializing would change the bytes Stripe signed.
    const body = '{"id":"evt_1ABC",  "type":"payment_intent.succeeded","data":{"object":{"id":"pi_1"}}}';
    const signature = "t=1764064800,v1=deadbeef";

    const res = await request(app.getHttpServer())
      .post("/webhooks/stripe")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(body)
      .expect(202);

    expect(res.body).toMatchObject({ accepted: true, eventId: "stripe:evt_1ABC" });
    expect(publish).toHaveBeenCalledTimes(1);
    const [, event] = publish.mock.calls[0];
    expect(event).toMatchObject({
      provider: "stripe",
      eventId: "stripe:evt_1ABC",
      rawBody: body,
      signature,
    });
  });

  it("rejects a Stripe request with no raw body parser (text/plain) with 400", async () => {
    await request(app.getHttpServer())
      .post("/webhooks/stripe")
      .set("Content-Type", "text/plain")
      .send("hello")
      .expect(400);

    expect(publish).not.toHaveBeenCalled();
  });

  it("normalizes provider case", async () => {
    const res = await request(app.getHttpServer())
      .post("/webhooks/STRIPE")
      .set("Content-Type", "application/json")
      .send('{"id":"evt_2"}')
      .expect(202);

    expect(res.body.eventId).toBe("stripe:evt_2");
  });
});
