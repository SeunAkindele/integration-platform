import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDeadLetterEventsTable1712050000000
  implements MigrationInterface
{
  name = "CreateDeadLetterEventsTable1712050000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dead_letter_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id varchar(255) NULL,
        original_subject varchar(255) NOT NULL,
        original_stream varchar(100) NOT NULL,
        original_sequence int NOT NULL,
        failed_consumer varchar(255) NOT NULL,
        dead_letter_reason varchar(100) NOT NULL,
        payload jsonb NULL,
        status varchar(50) NOT NULL DEFAULT 'pending',
        dead_lettered_at timestamptz NOT NULL,
        replayed_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dead_letter_events_event_id
      ON dead_letter_events(event_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dead_letter_events_failed_consumer
      ON dead_letter_events(failed_consumer);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dead_letter_events_original_subject
      ON dead_letter_events(original_subject);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dead_letter_events_status
      ON dead_letter_events(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dead_letter_events;`);
  }
}
