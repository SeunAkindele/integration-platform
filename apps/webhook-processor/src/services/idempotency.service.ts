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

  async hasBeenProcessed(eventId: string): Promise<boolean> {
    const existing = await this.processedEventRepo.findOne({
      where: { eventId },
    });
    return !!existing;
  }

  async markProcessed(
    eventId: string,
    provider: string,
    status: "processed" | "failed",
    notes?: string | null,
  ): Promise<ProcessedEventEntity> {
    const entity = this.processedEventRepo.create({
      eventId,
      provider,
      status,
      notes: notes ?? null,
      processedAt: new Date(),
    });

    return this.processedEventRepo.save(entity);
  }
}