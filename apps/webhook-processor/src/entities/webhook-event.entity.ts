import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from "typeorm";
  
  @Entity({ name: "webhook_events" })
  export class WebhookEventEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;
  
    @Index({ unique: true })
    @Column({ name: "event_id", type: "varchar", length: 255 })
    eventId!: string;
  
    @Column({ type: "varchar", length: 100 })
    provider!: string;
  
    @Column({ name: "received_at", type: "timestamptz" })
    receivedAt!: Date;
  
    @Column({ name: "source_ip", type: "varchar", length: 100, nullable: true })
    sourceIp!: string | null;
  
    @Column({ type: "varchar", length: 500, nullable: true })
    signature!: string | null;
  
    @Column({ type: "jsonb", default: () => "'{}'" })
    headers!: Record<string, unknown>;
  
    @Column({ name: "raw_body", type: "text" })
    rawBody!: string;
  
    @Column({ name: "parsed_body", type: "jsonb", nullable: true })
    parsedBody!: unknown | null;
  
    @Column({ type: "varchar", length: 50, default: "received" })
    status!: "received" | "validated" | "failed";
  
    @Column({ name: "failure_reason", type: "text", nullable: true })
    failureReason!: string | null;
  
    @CreateDateColumn({ name: "created_at", type: "timestamptz" })
    createdAt!: Date;
  
    @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
    updatedAt!: Date;
  }