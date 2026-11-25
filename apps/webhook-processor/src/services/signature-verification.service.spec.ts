import * as crypto from "crypto";
import { SignatureVerificationService } from "./signature-verification.service";

const SECRET = "whsec_test_secret";
const BODY = JSON.stringify({
  id: "evt_test_1",
  object: "event",
  type: "payment_intent.succeeded",
  data: { object: { object: "payment_intent", id: "pi_1" } },
});

function sign(body: string, timestamp: number, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

describe("SignatureVerificationService (Stripe)", () => {
  const service = new SignatureVerificationService();
  const now = 1_764_000_000; // fixed "gateway received" time, in seconds
  const context = { receivedAt: new Date(now * 1000).toISOString() };
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });

  it("accepts a valid signature", () => {
    const header = `t=${now},v1=${sign(BODY, now)}`;
    expect(service.verify("stripe", BODY, header, context)).toBe(true);
  });

  it("is case-insensitive on the provider name", () => {
    const header = `t=${now},v1=${sign(BODY, now)}`;
    expect(service.verify("Stripe", BODY, header, context)).toBe(true);
  });

  it("rejects a signature made with the wrong secret", () => {
    const header = `t=${now},v1=${sign(BODY, now, "whsec_other")}`;
    expect(service.verify("stripe", BODY, header, context)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const header = `t=${now},v1=${sign(BODY, now)}`;
    const tampered = BODY.replace("pi_1", "pi_2");
    expect(service.verify("stripe", tampered, header, context)).toBe(false);
  });

  it("rejects a timestamp outside the 5-minute window", () => {
    const stale = now - 301;
    const header = `t=${stale},v1=${sign(BODY, stale)}`;
    expect(service.verify("stripe", BODY, header, context)).toBe(false);
  });

  it("accepts a timestamp at the edge of the window", () => {
    const edge = now - 300;
    const header = `t=${edge},v1=${sign(BODY, edge)}`;
    expect(service.verify("stripe", BODY, header, context)).toBe(true);
  });

  it("measures the window from receivedAt, so replays of old genuine events verify", () => {
    // Signed 1 hour before "now" on the clock, but received right when it was signed.
    const signedAt = Math.floor(Date.now() / 1000) - 3600;
    const header = `t=${signedAt},v1=${sign(BODY, signedAt)}`;
    const replayContext = { receivedAt: new Date(signedAt * 1000).toISOString() };
    expect(service.verify("stripe", BODY, header, replayContext)).toBe(true);
  });

  it("accepts when any of several v1 signatures matches (secret rotation)", () => {
    const header = `t=${now},v1=${sign(BODY, now, "whsec_old")},v1=${sign(BODY, now)}`;
    expect(service.verify("stripe", BODY, header, context)).toBe(true);
  });

  it("ignores v0 signatures", () => {
    const header = `t=${now},v0=${sign(BODY, now)}`;
    expect(service.verify("stripe", BODY, header, context)).toBe(false);
  });

  it("rejects a header without a timestamp", () => {
    expect(service.verify("stripe", BODY, `v1=${sign(BODY, now)}`, context)).toBe(false);
  });

  it("rejects a malformed header", () => {
    expect(service.verify("stripe", BODY, "garbage", context)).toBe(false);
  });

  it("rejects a missing header when a secret is set", () => {
    expect(service.verify("stripe", BODY, null, context)).toBe(false);
  });

  it("allows everything when no secret is configured (local development)", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(service.verify("stripe", BODY, null, context)).toBe(true);
    expect(service.verify("stripe", BODY, "t=1,v1=bad", context)).toBe(true);
  });
});
