import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import { DataSource } from "typeorm";
import { WebhookEventEntity } from "./entities/webhook-event.entity";
import { ProcessedEventEntity } from "./entities/processed-event.entity";
import { DeadLetterEventEntity } from "./entities/dead-letter-event.entity";
import { CreateWebhookProcessorTables1710000000000 } from "./migrations/1710000000000-CreateWebhookProcessorTables";
import { CreateDeadLetterEventsTable1712050000000 } from "./migrations/1712050000000-CreateDeadLetterEventsTable";
import { AddReplayColumnsToDeadLetterEvents1712150000000 } from "./migrations/1712150000000-AddReplayColumnsToDeadLetterEvents";

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "integration_platform",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  entities: [WebhookEventEntity, ProcessedEventEntity, DeadLetterEventEntity],
  migrations: [
    CreateWebhookProcessorTables1710000000000,
    CreateDeadLetterEventsTable1712050000000,
    AddReplayColumnsToDeadLetterEvents1712150000000,
  ],
  synchronize: false,
});

dataSource
  .initialize()
  .then((ds) => ds.runMigrations())
  .then(() => {
    console.log("Migrations completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
