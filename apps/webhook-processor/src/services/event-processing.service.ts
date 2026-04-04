import {
    BadRequestException,
    Injectable,
    Logger,
  } from "@nestjs/common";
  import { WebhookReceivedEvent } from "@libs/contracts/events/webhook-received.event";
  import { WebhookValidatedEvent } from "@libs/contracts/events/webhook-validated.event";
  import { SUBJECTS } from "@libs/contracts/subjects";
  import { SignatureVerificationService } from "./signature-verification.service";
  import { IdempotencyService } from "./idempotency.service";
  import { WebhookEventStoreService } from "./webhook-event-store.service";
  import { Publisher } from "@libs/messaging/publisher";
  
  @Injectable()
  export class EventProcessingService {
    private readonly logger = new Logger(EventProcessingService.name);
  
    constructor(
      private readonly signatureVerificationService: SignatureVerificationService,
      private readonly idempotencyService: IdempotencyService,
      private readonly webhookEventStoreService: WebhookEventStoreService,
      private readonly publisher: Publisher,
    ) {}
  
    async handleReceivedEvent(event: WebhookReceivedEvent): Promise<void> {
      this.logger.log(
        `Processing received webhook eventId=${event.eventId}, provider=${event.provider}`,
      );
  
      const alreadyProcessed = await this.idempotencyService.hasBeenProcessed(event.eventId);
      if (alreadyProcessed) {
        this.logger.warn(`Skipping duplicate eventId=${event.eventId}`);
        return;
      }
  
      const alreadyStored = await this.webhookEventStoreService.exists(event.eventId);
      if (!alreadyStored) {
        await this.webhookEventStoreService.saveReceivedEvent(event);
      }
  
      const isValid = this.signatureVerificationService.verify(
        event.provider,
        event.rawBody,
        event.signature,
      );
      
      if (!isValid) {
        await this.webhookEventStoreService.markFailed(
          event.eventId,
          "Signature verification failed",
        );
  
        await this.idempotencyService.markProcessed(
          event.eventId,
          event.provider,
          "failed",
          "Signature verification failed",
        );
  
        throw new BadRequestException("Invalid webhook signature");
      }
  
      await this.webhookEventStoreService.markValidated(event.eventId);
  
      const validatedEvent: WebhookValidatedEvent = {
        eventId: event.eventId,
        provider: event.provider,
        receivedAt: event.receivedAt,
        validatedAt: new Date().toISOString(),
        payload: event.parsedBody ?? this.safeJsonParse(event.rawBody),
      };
  
      await this.publisher.publish(SUBJECTS.WEBHOOK_VALIDATED_V1, validatedEvent);
  
      await this.idempotencyService.markProcessed(
        event.eventId,
        event.provider,
        "processed",
        "Stored and validated successfully",
      );
  
      this.logger.log(`Completed processing eventId=${event.eventId}`);
    }
  
    private safeJsonParse(rawBody: string): unknown {
      try {
        return JSON.parse(rawBody);
      } catch {
        return { rawBody };
      }
    }
  }