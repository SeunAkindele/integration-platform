import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIntegrationsTable1711990000000
  implements MigrationInterface
{
  name = "CreateIntegrationTable1711990000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    await queryRunner.query(`
      CREATE TABLE "integrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" varchar(191) NOT NULL,
        "provider" varchar(50) NOT NULL,
        "action" varchar(120) NOT NULL,
        "status" varchar(50) NOT NULL,
        "summary" text,
        "payload" jsonb,
        "result" jsonb,
        "errorMessage" text,
        "receivedAt" TIMESTAMPTZ,
        "validatedAt" TIMESTAMPTZ,
        "processedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integrations_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_integrations_eventId"
      ON "integrations" ("eventId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_integrations_eventId";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "integrations";
    `);
  }
}
