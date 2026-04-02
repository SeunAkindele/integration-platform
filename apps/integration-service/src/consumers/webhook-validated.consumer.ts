import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { JetStreamService } from "../../../../libs/messaging/jetstream.service";
import { Publisher } from "../../../../libs/messaging/publisher";
import { SUBJECTS } from "../../../../libs/contracts/subjects";
import { WebhookValidatedEvent } from "../../../../libs/contracts/events/webhook-validated.event";
import { IntegrationProcessedEvent } from "../../../../libs/contracts/events/integration-processed.event";
import { IntegrationRouterService } from "../services/integration-router.service";
import { ConsumerFactory } from "@libs/messaging/consumer.factory";

@Injectable()
export class WebhookValidatedConsumer implements OnModuleInit {
  private readonly logger = new Logger(WebhookValidatedConsumer.name);

  constructor(
    private readonly jetStreamService: JetStreamService,
    private readonly publisher: Publisher,
    private readonly consumerFactory: ConsumerFactory,
    private readonly integrationRouterService: IntegrationRouterService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.consume();
  }

  private async consume(): Promise<void> {
    const durableName = "integration-service-webhook-validated-v1";

    this.logger.log(
      `Consuming subject ${SUBJECTS.WEBHOOK_VALIDATED_V1} with durable ${durableName}`,
    );

    const js = this.jetStreamService.getClient();

    const consumer = await this.consumerFactory.createPullConsumer({
      js,
      stream: "WEBHOOKS",
      durableName,
      filterSubject: SUBJECTS.WEBHOOK_VALIDATED_V1,
      ackWaitMs: 30_000,
      maxDeliver: 5,
    });

    const messages = await consumer.consume();

    for await (const msg of messages) {
      try {
        const event = this.decode(msg.data) as WebhookValidatedEvent;

        const result = await this.integrationRouterService.process(event);

        const processedEvent: IntegrationProcessedEvent = {
          eventId: event.eventId,
          provider: event.provider,
          status: "processed",
          action: result.action,
          summary: result.summary,
          processedAt: new Date().toISOString(),
          data: result.data,
          errorMessage: null,
        };

        await this.publisher.publish(
          SUBJECTS.INTEGRATION_PROCESSED_V1,
          processedEvent,
        );

        msg.ack();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown webhook validated consumer error";

        this.logger.error(`Failed to process validated webhook: ${message}`);

        msg.nak();
      }
    }
  }

  private decode(payload: Uint8Array): unknown {
    return JSON.parse(Buffer.from(payload).toString("utf8"));
  }
}