import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { NATS_SERVICE } from "./nats.service";

@Injectable()
export class EventPublisher implements OnModuleInit {
  constructor(
    @Inject(NATS_SERVICE)
    private readonly client: ClientProxy,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async publish<TPayload>(subject: string, payload: TPayload): Promise<void> {
    await firstValueFrom(this.client.emit(subject, payload));
  }
}