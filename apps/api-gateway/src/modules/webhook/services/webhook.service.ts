import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { EventPublisher } from "../../../../../../libs/messaging/publisher";
import { WEBHOOK_SUBJECTS } from "../../../../../../libs/common/contracts/webhook-event.contract";
import { WebhookReceivedEventDto } from "../../../../../../libs/common/dto/webhook-event.dto";

export interface InboundWebhookPayload {
  provider: string;
  path: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  rawBody: string;
  sourceIp: string | null;
}

@Injectable()
export class WebhookService {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async acceptWebhook(input: InboundWebhookPayload): Promise<{ accepted: true; eventId: string }> {
    const event: WebhookReceivedEventDto = {
      eventId: randomUUID(),
      provider: input.provider,
      receivedAt: new Date().toISOString(),
      path: input.path,
      method: input.method,
      headers: input.headers,
      query: input.query,
      rawBody: input.rawBody,
      sourceIp: input.sourceIp,
    };

    await this.eventPublisher.publish(WEBHOOK_SUBJECTS.RECEIVED, event);

    return {
      accepted: true,
      eventId: event.eventId,
    };
  }
}