import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class ConsumerFactory {
  private readonly logger = new Logger(ConsumerFactory.name);

  async createPullConsumer({
    js,
    stream,
    durableName,
    filterSubject,
    ackWaitMs,
    maxDeliver,
  }: {
    js: any;
    stream: string;
    durableName: string;
    filterSubject: string;
    ackWaitMs: number;
    maxDeliver: number;
  }) {
    const jsm = await js.jetstreamManager();
    const config = {
      durable_name: durableName,
      ack_policy: "explicit",
      filter_subject: filterSubject,
      ack_wait: ackWaitMs * 1_000_000,
      max_deliver: maxDeliver,
    };

    try {
      await jsm.consumers.add(stream, config);
    } catch (error: any) {
      const message = String(error?.message || "");
      if (
        message.includes("consumer already exists") ||
        message.includes("consumer name already in use")
      ) {
        this.logger.warn(
          `Consumer "${durableName}" exists with incompatible config — deleting and recreating`,
        );
        await jsm.consumers.delete(stream, durableName);
        await jsm.consumers.add(stream, config);
      } else {
        throw error;
      }
    }

    return js.consumers.get(stream, durableName);
  }
}