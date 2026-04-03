import { Injectable } from "@nestjs/common";
import { JetStreamService } from "./jetstream.service";

@Injectable()
export class Publisher {
  constructor(private readonly jetStreamService: JetStreamService) {}

  async publish(subject: string, payload: unknown): Promise<void> {
    const js = this.jetStreamService.getClient();
    await js.publish(subject, Buffer.from(JSON.stringify(payload)));
  }
}