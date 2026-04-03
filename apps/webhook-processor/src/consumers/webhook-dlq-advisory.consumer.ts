import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { JSONCodec } from "nats";
import { JetStreamService } from "@libs/messaging/jetstream.service";
import { WebhookDlqService } from "../services/webhook-dlq.service";

type MaxDeliverAdvisory = {
  type: string;
  id: string;
  timestamp: string;
  stream: string;
  consumer: string;
  stream_seq: number;
  deliveries: number;
  domain?: string;
};

@Injectable()
export class WebhookDlqAdvisoryConsumer implements OnModuleInit {
  private readonly logger = new Logger(WebhookDlqAdvisoryConsumer.name);
  private readonly json = JSONCodec<MaxDeliverAdvisory>();

  private static readonly STREAM = "WEBHOOKS";
  private static readonly CONSUMER = "webhook-processor-received-v1";

  constructor(
    private readonly jetStreamService: JetStreamService,
    private readonly webhookDlqService: WebhookDlqService,
  ) {}

  async onModuleInit() {
    const nc = this.jetStreamService.getConnection();

    const advisorySubject =
      `$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.` +
      `${WebhookDlqAdvisoryConsumer.STREAM}.` +
      `${WebhookDlqAdvisoryConsumer.CONSUMER}`;

    const sub = nc.subscribe(advisorySubject);

    (async () => {
      for await (const msg of sub) {
        try {
          const advisory = this.json.decode(msg.data);

          this.logger.warn(
            `Received max-deliver advisory for stream=${advisory.stream} consumer=${advisory.consumer} seq=${advisory.stream_seq} deliveries=${advisory.deliveries}`,
          );

          await this.webhookDlqService.moveToDlq(advisory.stream_seq);
        } catch (error) {
          this.logger.error(
            `Failed handling DLQ advisory: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }
    })();

    this.logger.log(`Subscribed to advisory subject "${advisorySubject}"`);
  }
}