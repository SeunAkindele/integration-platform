import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeadLetterEventEntity } from "../../../../../apps/webhook-processor/src/entities/dead-letter-event.entity";
import { ProcessedEventEntity } from "../../../../../apps/webhook-processor/src/entities/processed-event.entity";
import { NatsModule } from "../../../../../libs/messaging/nats.module";
import { DlqController } from "./controllers/dlq.controller";
import { DlqReplayService } from "./services/dlq-replay.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([DeadLetterEventEntity, ProcessedEventEntity]),
    NatsModule,
  ],
  controllers: [DlqController],
  providers: [DlqReplayService],
})
export class DlqModule {}
