import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from "typeorm";
  
  @Entity({ name: "integrations" })
  export class IntegrationEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
  
    @Index()
    @Column({ type: "varchar", length: 191 })
    eventId: string;
  
    @Column({ type: "varchar", length: 50 })
    provider: string;
  
    @Column({ type: "varchar", length: 120 })
    action: string;
  
    @Column({ type: "varchar", length: 50 })
    status: "processing" | "processed" | "failed";
  
    @Column({ type: "text", nullable: true })
    summary: string | null;
  
    @Column({ type: "jsonb", nullable: true })
    payload: Record<string, unknown> | null;
  
    @Column({ type: "jsonb", nullable: true })
    result: Record<string, unknown> | null;
  
    @Column({ type: "text", nullable: true })
    errorMessage: string | null;
  
    @Column({ type: "timestamptz", nullable: true })
    receivedAt: Date | null;
  
    @Column({ type: "timestamptz", nullable: true })
    validatedAt: Date | null;
  
    @Column({ type: "timestamptz", nullable: true })
    processedAt: Date | null;
  
    @CreateDateColumn({ type: "timestamptz" })
    createdAt: Date;
  
    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt: Date;
  }