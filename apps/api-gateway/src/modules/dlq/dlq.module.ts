import { Module } from "@nestjs/common";
import { NatsModule } from "@libs/messaging/nats.module";
import { DlqController } from "./controllers/dlq.controller";
import { DlqReplayService } from "./services/dlq-replay.service";

@Module({
  imports: [NatsModule],
  controllers: [DlqController],
  providers: [DlqReplayService],
})
export class DlqModule {}
