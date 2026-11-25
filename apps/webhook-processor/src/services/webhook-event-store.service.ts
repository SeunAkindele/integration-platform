import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WebhookEventEntity } from "../entities/webhook-event.entity";
import { WebhookReceivedEvent } from "@libs/contracts/events/webhook-received.event";

@Injectable()
export class WebhookEventStoreService {
  constructor(
    @InjectRepository(WebhookEventEntity)
    private readonly webhookEventRepo: Repository<WebhookEventEntity>,
  ) {}

  async saveReceivedEvent(event: WebhookReceivedEvent): Promise<WebhookEventEntity> {
    const entity = this.webhookEventRepo.create({
      eventId: event.eventId,
      provider: event.provider,
      receivedAt: new Date(event.receivedAt),
      sourceIp: event.sourceIp ?? null,
      signature: event.signature ?? null,
      headers: event.headers ?? {},
      rawBody: event.rawBody,
      parsedBody: event.parsedBody ?? null,
      status: "received",
    });

    return this.webhookEventRepo.save(entity);
  }

  /**
   * A provider retry arrives with the same eventId. Overwrite the stored delivery so the
   * row reflects the request actually being verified, not an earlier (possibly forged) one.
   */
  async refreshReceivedEvent(event: WebhookReceivedEvent): Promise<void> {
    await this.webhookEventRepo.update(
      { eventId: event.eventId },
      {
        receivedAt: new Date(event.receivedAt),
        sourceIp: event.sourceIp ?? null,
        signature: event.signature ?? null,
        headers: (event.headers ?? {}) as any,
        rawBody: event.rawBody,
        parsedBody: (event.parsedBody ?? null) as any,
        status: "received",
        failureReason: null,
      },
    );
  }

  async markValidated(eventId: string): Promise<void> {
    await this.webhookEventRepo.update(
      { eventId },
      { status: "validated", failureReason: null },
    );
  }

  async markFailed(eventId: string, reason: string): Promise<void> {
    await this.webhookEventRepo.update(
      { eventId },
      { status: "failed", failureReason: reason },
    );
  }

  async exists(eventId: string): Promise<boolean> {
    const existing = await this.webhookEventRepo.findOne({
      where: { eventId },
      select: { id: true, eventId: true },
    });

    return !!existing;
  }
}