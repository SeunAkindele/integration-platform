import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWebhookProcessorTables1710000000000
  implements MigrationInterface
{
  name = "CreateWebhookProcessorTables1710000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id varchar(255) NOT NULL UNIQUE,
        provider varchar(100) NOT NULL,
        received_at timestamptz NOT NULL,
        source_ip varchar(100) NULL,
        signature varchar(500) NULL,
        headers jsonb NOT NULL DEFAULT '{}'::jsonb,
        raw_body text NOT NULL,
        parsed_body jsonb NULL,
        status varchar(50) NOT NULL DEFAULT 'received',
        failure_reason text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id varchar(255) NOT NULL UNIQUE,
        provider varchar(100) NOT NULL,
        status varchar(50) NOT NULL,
        notes text NULL,
        processed_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_provider
      ON webhook_events(provider);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_processed_events_provider
      ON processed_events(provider);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS processed_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS webhook_events;`);
  }
}