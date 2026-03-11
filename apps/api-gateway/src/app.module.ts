import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WebhookModule } from "./modules/webhook/webhook.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["apps/api-gateway/.env", ".env"],
    }),
    WebhookModule,
  ],
})
export class AppModule {}