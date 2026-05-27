import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { IntegrationRouterService } from "./services/integration-router.service";
import { IntegrationService } from "./services/integration.service";
import { WebhookValidatedConsumer } from "./consumers/webhook-validated.consumer";
import { GithubAdapter } from "./adapters/github.adapter";
import { SlackAdapter } from "./adapters/slack.adapter";
import { StripeAdapter } from "./adapters/stripe.adapter";
import { NatsModule } from "@libs/messaging/nats.module";
import { IntegrationEntity } from "./entities/integration.entity";

@Module({
  imports: [
    
    ConfigModule.forRoot({ isGlobal: true }),
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
    TypeOrmModule.forFeature([IntegrationEntity]),
    NatsModule,
  ],
  providers: [
    IntegrationRouterService,
    IntegrationService,
    WebhookValidatedConsumer,
    GithubAdapter,
    SlackAdapter,
    StripeAdapter,
  ],
})
export class AppModule {}
