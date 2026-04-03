import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeadLetterEventEntity } from "../entities/dead-letter-event.entity";
import { WebhookDlqEvent } from "@libs/contracts/events/webhook-dlq.event";

@Injectable()
export class WebhookDlqStoreService {
  private readonly logger = new Logger(WebhookDlqStoreService.name);

  constructor(
    @InjectRepository(DeadLetterEventEntity)
    private readonly repo: Repository<DeadLetterEventEntity>,
  ) {}

  async save(dlqEvent: WebhookDlqEvent): Promise<void> {
    const eventId = this.extractEventId(dlqEvent.payload);

    const entity = this.repo.create({
      eventId,
      originalSubject: dlqEvent.originalSubject,
      originalStream: dlqEvent.originalStream,
      originalSequence: dlqEvent.originalSequence,
      failedConsumer: dlqEvent.failedConsumer,
      deadLetterReason: dlqEvent.deadLetterReason,
      payload: dlqEvent.payload,
      deadLetteredAt: new Date(dlqEvent.deadLetteredAt),
    });

    await this.repo.save(entity);

    this.logger.log(
      `Persisted DLQ event seq=${dlqEvent.originalSequence} consumer=${dlqEvent.failedConsumer} eventId=${eventId ?? "unknown"}`,
    );
  }

  private extractEventId(payload: unknown): string | null {
    if (
      payload != null &&
      typeof payload === "object" &&
      "eventId" in payload
    ) {
      return String((payload as Record<string, unknown>).eventId);
    }
    return null;
  }
}
