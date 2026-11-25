import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Publisher } from "@libs/messaging/publisher";
import { SUBJECTS } from "@libs/contracts/subjects";
import { WebhookReceivedEvent } from "@libs/contracts/events/webhook-received.event";
import { AcceptWebhookInput } from "../interfaces/accept-webhook.input";
import { SIGNATURE_HEADER_BY_PROVIDER } from "../constants/signature-header.constant";
import { WebhookProvider } from "@libs/common/enums/webhook-provider.enum";

/** Provider delivery ids we trust as dedupe keys: short, no whitespace or odd characters. */
// 150 + "provider:" prefix stays under integrations.eventId varchar(191).
const PROVIDER_EVENT_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,150}$/;

@Injectable()
export class WebhookService {
  constructor(private readonly publisher: Publisher) {}

  async acceptWebhook(input: AcceptWebhookInput): Promise<{ accepted: true; eventId: string }> {
    const parsedBody = this.safeParseJson(input.rawBody);
    const signature = this.extractSignature(input.headers, input.provider);

    const event: WebhookReceivedEvent = {
      eventId: this.deriveEventId(input.provider, input.headers, parsedBody),
      provider: input.provider,
      receivedAt: new Date().toISOString(),
      path: input.path,
      method: input.method,
      headers: input.headers,
      query: input.query,
      rawBody: input.rawBody,
      sourceIp: input.sourceIp,
      parsedBody,
      signature,
    };

    await this.publisher.publish(SUBJECTS.WEBHOOK_RECEIVED_V1, event);

    return {
      accepted: true,
      eventId: event.eventId,
    };
  }

  /**
   * Providers retry a delivery with the same id, so we key idempotency on that id
   * instead of a fresh UUID per HTTP request:
   *   stripe -> body.id (evt_...), slack -> body.event_id, github -> x-github-delivery.
   * Namespaced by provider; falls back to a random UUID when no usable id exists.
   */
  private deriveEventId(
    provider: string,
    headers: Record<string, string | string[] | undefined>,
    parsedBody: unknown,
  ): string {
    const body =
      parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)
        ? (parsedBody as Record<string, unknown>)
        : {};

    let providerEventId: unknown = null;
    switch (provider.toLowerCase()) {
      case WebhookProvider.STRIPE:
        providerEventId = body.id;
        break;
      case WebhookProvider.SLACK:
        providerEventId = body.event_id;
        break;
      case WebhookProvider.GITHUB:
        providerEventId = this.getHeader(headers, "x-github-delivery");
        break;
    }

    if (typeof providerEventId === "string" && PROVIDER_EVENT_ID_PATTERN.test(providerEventId)) {
      return `${provider.toLowerCase()}:${providerEventId}`;
    }
    return randomUUID();
  }

  private safeParseJson(rawBody: string): unknown {
    try {
      return JSON.parse(rawBody);
    } catch {
      return undefined;
    }
  }

  private extractSignature(
    headers: Record<string, string | string[] | undefined>,
    provider: string,
  ): string | null {
    const key = provider.toLowerCase() as keyof typeof SIGNATURE_HEADER_BY_PROVIDER;
    const headerName = SIGNATURE_HEADER_BY_PROVIDER[key];
    if (!headerName) return null;
    const lower = headerName.toLowerCase();
    return (
      this.getHeader(headers, lower) ??
      this.getHeader(headers, headerName)
    );
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    key: string,
  ): string | null {
    const lower = key.toLowerCase();
    const value = headers[lower] ?? headers[key];
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }
}
