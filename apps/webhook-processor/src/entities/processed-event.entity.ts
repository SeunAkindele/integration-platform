import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
  } from "typeorm";
  
  @Entity({ name: "processed_events" })
  export class ProcessedEventEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;
  
    @Index({ unique: true })
    @Column({ name: "event_id", type: "varchar", length: 255 })
    eventId!: string;
  
    @Column({ type: "varchar", length: 100 })
    provider!: string;
  
    @Column({ type: "varchar", length: 50 })
    status!: "processed" | "failed";
  
    @Column({ type: "text", nullable: true })
    notes!: string | null;
  
    @Column({ name: "processed_at", type: "timestamptz" })
    processedAt!: Date;
  
    @CreateDateColumn({ name: "created_at", type: "timestamptz" })
    createdAt!: Date;
  }