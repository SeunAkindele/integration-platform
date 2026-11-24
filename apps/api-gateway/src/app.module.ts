import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebhookModule } from "./modules/webhook/webhook.module";
import { DlqModule } from "./modules/dlq/dlq.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["apps/api-gateway/.env", ".env"],
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
    WebhookModule,
    DlqModule,
  ],
})
export class AppModule {}