import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "dead_letter_events" })
export class DeadLetterEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "event_id", type: "varchar", length: 255, nullable: true })
  eventId!: string | null;

  @Index()
  @Column({ name: "original_subject", type: "varchar", length: 255 })
  originalSubject!: string;

  @Column({ name: "original_stream", type: "varchar", length: 100 })
  originalStream!: string;

  @Column({ name: "original_sequence", type: "int" })
  originalSequence!: number;

  @Index()
  @Column({ name: "failed_consumer", type: "varchar", length: 255 })
  failedConsumer!: string;

  @Column({ name: "dead_letter_reason", type: "varchar", length: 100 })
  deadLetterReason!: string;

  @Column({ type: "jsonb", nullable: true })
  payload!: unknown;

  @Index()
  @Column({ type: "varchar", length: 50, default: "pending" })
  status!: "pending" | "replayed";

  @Column({
    name: "dead_lettered_at",
    type: "timestamptz",
  })
  deadLetteredAt!: Date;

  @Column({ name: "replayed_at", type: "timestamptz", nullable: true })
  replayedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
