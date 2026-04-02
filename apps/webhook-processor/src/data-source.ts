import * as dotenv from "dotenv";
dotenv.config();

import { DataSource } from "typeorm";
import { WebhookEventEntity } from "./entities/webhook-event.entity";
import { ProcessedEventEntity } from "./entities/processed-event.entity";
import { DeadLetterEventEntity } from "./entities/dead-letter-event.entity";

export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "integration_platform",
  entities: [WebhookEventEntity, ProcessedEventEntity, DeadLetterEventEntity],
  migrations: [
    "apps/webhook-processor/src/migrations/*.ts",
  ],
  synchronize: false,
});