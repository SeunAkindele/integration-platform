import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Publisher } from "@libs/messaging/publisher";
import { SUBJECTS } from "@libs/contracts/subjects";
import { WebhookReceivedEvent } from "@libs/contracts/events/webhook-received.event";
import { AcceptWebhookInput } from "../interfaces/accept-webhook.input";
import { SIGNATURE_HEADER_BY_PROVIDER } from "../constants/signature-header.constant";

@Injectable()
export class WebhookService {
  constructor(private readonly publisher: Publisher) {}

  async acceptWebhook(input: AcceptWebhookInput): Promise<{ accepted: true; eventId: string }> {
    const parsedBody = this.safeParseJson(input.rawBody);
    const signature = this.extractSignature(input.headers, input.provider);

    const event: WebhookReceivedEvent = {
      eventId: randomUUID(),
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
    const headerName = SIGNATURE_HEADER_BY_PROVIDER[provider];
    return headerName ? this.getHeader(headers, headerName) : null;
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    key: string,
  ): string | null {
    const value = headers[key];
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }
}