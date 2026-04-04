import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WebhookReceivedConsumer } from "./consumers/webhook-received.consumer";
import { SignatureVerificationService } from "./services/signature-verification.service";
import { IdempotencyService } from "./services/idempotency.service";
import { WebhookEventStoreService } from "./services/webhook-event-store.service";
import { EventProcessingService } from "./services/event-processing.service";
import { WebhookEventEntity } from "./entities/webhook-event.entity";
import { ProcessedEventEntity } from "./entities/processed-event.entity";
import { DeadLetterEventEntity } from "./entities/dead-letter-event.entity";
import { NatsModule } from "@libs/messaging/nats.module";
import { WebhookDlqAdvisoryConsumer } from "./consumers/webhook-dlq-advisory.consumer";
import { WebhookDlqService } from "./services/webhook-dlq.service";
import { WebhookDlqStoreService } from "./services/webhook-dlq-store.service";
import { DlqResponderService } from "./services/dlq-responder.service";
import { CreateWebhookProcessorTables1710000000000 } from "./migrations/1710000000000-CreateWebhookProcessorTables";
import { CreateDeadLetterEventsTable1712050000000 } from "./migrations/1712050000000-CreateDeadLetterEventsTable";
import { AddReplayColumnsToDeadLetterEvents1712150000000 } from "./migrations/1712150000000-AddReplayColumnsToDeadLetterEvents";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("DB_HOST", "localhost"),
        port: Number(config.get<string>("DB_PORT", "5432")),
        username: config.get<string>("DB_USER", "postgres"),
        password: config.get<string>("DB_PASSWORD", "postgres"),
        database: config.get<string>("DB_NAME", "integration_platform"),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [
          CreateWebhookProcessorTables1710000000000,
          CreateDeadLetterEventsTable1712050000000,
          AddReplayColumnsToDeadLetterEvents1712150000000,
        ],
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([WebhookEventEntity, ProcessedEventEntity, DeadLetterEventEntity]),
    NatsModule,
  ],
  providers: [
    WebhookReceivedConsumer,
    WebhookDlqAdvisoryConsumer,
    SignatureVerificationService,
    IdempotencyService,
    WebhookDlqService,
    WebhookDlqStoreService,
    WebhookEventStoreService,
    EventProcessingService,
    DlqResponderService,
  ],
})
export class AppModule {}