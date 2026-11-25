import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProcessedEventEntity } from "../entities/processed-event.entity";

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(ProcessedEventEntity)
    private readonly processedEventRepo: Repository<ProcessedEventEntity>,
  ) {}

  /**
   * True only when the event was processed successfully. A "failed" record (e.g. bad
   * signature) must not block a later delivery with the same provider event id, or a
   * forged request could suppress the genuine one.
   */
  async hasBeenProcessed(eventId: string): Promise<boolean> {
    const existing = await this.processedEventRepo.findOne({
      where: { eventId, status: "processed" },
    });
    return !!existing;
  }

  async markProcessed(
    eventId: string,
    provider: string,
    status: "processed" | "failed",
    notes?: string | null,
  ): Promise<void> {
    // Upsert: a retried delivery reuses the provider event id, so a row may already exist.
    await this.processedEventRepo.upsert(
      {
        eventId,
        provider,
        status,
        notes: notes ?? null,
        processedAt: new Date(),
      },
      ["eventId"],
    );
  }
}