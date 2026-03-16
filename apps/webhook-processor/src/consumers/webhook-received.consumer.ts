import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { EventProcessingService } from "../services/event-processing.service";
import { SUBJECTS } from "../../../../libs/contracts/subjects";
import { WebhookReceivedEvent } from "../../../../libs/contracts/events/webhook-received.event";
import { JetStreamService } from "../../../../libs/messaging/jetstream.service";
import { ConsumerFactory } from "../../../../libs/messaging/consumer.factory";

@Injectable()
export class WebhookReceivedConsumer implements OnModuleInit {
  private readonly logger = new Logger(WebhookReceivedConsumer.name);

  constructor(
    private readonly jetStreamService: JetStreamService,
    private readonly consumerFactory: ConsumerFactory,
    private readonly eventProcessingService: EventProcessingService,
  ) {}

  async onModuleInit() {
    const js = this.jetStreamService.getClient();

    const consumer = await this.consumerFactory.createPullConsumer({
      js,
      stream: "WEBHOOKS",
      durableName: "webhook-processor-received-v1",
      filterSubject: SUBJECTS.WEBHOOK_RECEIVED_V1,
      ackWaitMs: 30_000,
      maxDeliver: 5,
    });

    const messages = await consumer.consume();

    (async () => {
      for await (const msg of messages) {
        try {
          const data = this.decode(msg.data) as WebhookReceivedEvent;
          await this.eventProcessingService.handleReceivedEvent(data);
          msg.ack();
        } catch (error) {
          this.logger.error(
            `Failed processing webhook.received.v1: ${(error as Error).message}`,
            (error as Error).stack,
          );
          msg.nak();
        }
      }
    })();

    this.logger.log(
      `Consuming subject ${SUBJECTS.WEBHOOK_RECEIVED_V1} with durable webhook-processor-received-v1`,
    );
  }

  private decode(payload: Uint8Array): unknown {
    return JSON.parse(Buffer.from(payload).toString("utf8"));
  }
}