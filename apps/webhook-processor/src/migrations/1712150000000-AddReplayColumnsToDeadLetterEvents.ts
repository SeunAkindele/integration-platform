import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReplayColumnsToDeadLetterEvents1712150000000
  implements MigrationInterface
{
  name = "AddReplayColumnsToDeadLetterEvents1712150000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dead_letter_events
        ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS replayed_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dead_letter_events_status
      ON dead_letter_events(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dead_letter_events_status;
    `);

    await queryRunner.query(`
      ALTER TABLE dead_letter_events
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS replayed_at,
        DROP COLUMN IF EXISTS updated_at;
    `);
  }
}
