import { Module } from "@nestjs/common";
import { WebhookController } from "./controllers/webhook.controller";
import { WebhookService } from "./services/webhook.service";
import { NatsModule } from "../../../../../libs/messaging/nats.module";
import { Publisher } from "../../../../../libs/messaging/publisher";

@Module({
  imports: [NatsModule],
  controllers: [WebhookController],
  providers: [WebhookService, Publisher],
})
export class WebhookModule {}