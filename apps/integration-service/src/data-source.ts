import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";
import { IntegrationEntity } from "./entities/integration.entity";

dotenv.config();

export default new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "integration_platform",
    entities: [IntegrationEntity],
    migrations: ["apps/integration-service/src/migrations/*.ts"],
    synchronize: false,
});