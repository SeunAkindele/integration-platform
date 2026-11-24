import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import { DataSource } from "typeorm";
import { IntegrationEntity } from "./entities/integration.entity";
import { CreateIntegrationsTable1711990000000 } from "./migrations/1711990000000-CreateIntegrationTable";

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "integration_platform",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  entities: [IntegrationEntity],
  migrations: [CreateIntegrationsTable1711990000000],
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
