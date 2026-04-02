import { Injectable, Logger } from "@nestjs/common";
import { JSONCodec } from "nats";
import { JetStreamService } from "../../../../libs/messaging/jetstream.service";
import { SUBJECTS } from "../../../../libs/contracts/subjects";
import { WebhookDlqEvent } from "../../../../libs/contracts/events/webhook-dlq.event";
import { WebhookDlqStoreService } from "./webhook-dlq-store.service";

@Injectable()
export class WebhookDlqService {
  private readonly logger = new Logger(WebhookDlqService.name);
  private readonly json = JSONCodec();

  private static readonly SOURCE_STREAM = "WEBHOOKS";
  private static readonly FAILED_CONSUMER = "webhook-processor-received-v1";

  constructor(
    private readonly jetStreamService: JetStreamService,
    private readonly dlqStoreService: WebhookDlqStoreService,
  ) {}

  async moveToDlq(streamSeq: number): Promise<void> {
    const js = this.jetStreamService.getClient();
    const jsm = await js.jetstreamManager();

    const stored = await jsm.streams.getMessage(WebhookDlqService.SOURCE_STREAM, {
      seq: streamSeq,
    });

    if (!stored) {
      this.logger.warn(
        `No source message found in stream "${WebhookDlqService.SOURCE_STREAM}" for seq=${streamSeq}`,
      );
      return;
    }

    const payload = this.decode(stored.data);

    const dlqEvent: WebhookDlqEvent = {
      originalSubject: stored.subject,
      originalStream: WebhookDlqService.SOURCE_STREAM,
      originalSequence: streamSeq,
      failedConsumer: WebhookDlqService.FAILED_CONSUMER,
      deadLetterReason: "max_deliver_exceeded",
      deadLetteredAt: new Date().toISOString(),
      payload,
    };

    await js.publish(
      SUBJECTS.WEBHOOK_DLQ_V1,
      this.json.encode(dlqEvent),
    );

    await this.dlqStoreService.save(dlqEvent);

    this.logger.warn(
      `Moved message seq=${streamSeq} subject="${stored.subject}" to DLQ subject "${SUBJECTS.WEBHOOK_DLQ_V1}"`,
    );
  }

  private decode(data: Uint8Array): unknown {
    try {
      return this.json.decode(data);
    } catch {
      return JSON.parse(Buffer.from(data).toString("utf8"));
    }
  }
}