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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        host: config.get<string>("DB_HOST", "localhost"),
        port: Number(config.get<string>("DB_PORT", "5432")),
        username: config.get<string>("DB_USER", "postgres"),
        password: config.get<string>("DB_PASSWORD", "postgres"),
        database: config.get<string>("DB_NAME", "integration_platform"),
        ssl: config.get<string>("DB_SSL") === "true" ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: false,
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