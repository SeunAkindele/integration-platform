import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { connect, JetStreamClient, NatsConnection } from "nats";

@Injectable()
export class JetStreamService implements OnModuleInit {
  private readonly logger = new Logger(JetStreamService.name);
  private nc!: NatsConnection;
  private js!: JetStreamClient;

  async onModuleInit() {
    this.nc = await connect({
      servers: process.env.NATS_SERVERS || "nats://localhost:4222",
    });

    this.js = this.nc.jetstream();

    await this.ensureStreams();
  }

  private async ensureStreams() {
    const jsm = await this.js.jetstreamManager();

    const streams: { name: string; subjects: string[] }[] = [
      { name: "WEBHOOKS", subjects: ["webhook.>"] },
      { name: "WEBHOOKS_DLQ", subjects: ["dlq.webhook.>"] },
    ];

    for (const cfg of streams) {
      try {
        await jsm.streams.info(cfg.name);
        this.logger.log(`Stream "${cfg.name}" already exists`);
      } catch {
        await jsm.streams.add({ name: cfg.name, subjects: cfg.subjects });
        this.logger.log(`Created stream "${cfg.name}" with subjects [${cfg.subjects}]`);
      }
    }
  }

  getClient(): JetStreamClient {
    return this.js;
  }

  getConnection(): NatsConnection {
    return this.nc;
  }
}