import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeadLetterEventEntity } from "../../../../../../apps/webhook-processor/src/entities/dead-letter-event.entity";
import { ProcessedEventEntity } from "../../../../../../apps/webhook-processor/src/entities/processed-event.entity";
import { Publisher } from "../../../../../../libs/messaging/publisher";

@Injectable()
export class DlqReplayService {
  private readonly logger = new Logger(DlqReplayService.name);

  constructor(
    @InjectRepository(DeadLetterEventEntity)
    private readonly dlqRepo: Repository<DeadLetterEventEntity>,
    @InjectRepository(ProcessedEventEntity)
    private readonly processedEventRepo: Repository<ProcessedEventEntity>,
    private readonly publisher: Publisher,
  ) {}

  async findAll(status?: "pending" | "replayed"): Promise<DeadLetterEventEntity[]> {
    const where = status ? { status } : {};
    return this.dlqRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<DeadLetterEventEntity> {
    const entry = await this.dlqRepo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`DLQ entry ${id} not found`);
    }
    return entry;
  }

  async updatePayload(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<DeadLetterEventEntity> {
    const entry = await this.findOne(id);
    entry.payload = payload;
    return this.dlqRepo.save(entry);
  }

  async replay(id: string): Promise<{ replayedTo: string }> {
    const entry = await this.findOne(id);

    if (entry.status === "replayed") {
      throw new NotFoundException(`DLQ entry ${id} has already been replayed`);
    }

    if (entry.eventId) {
      await this.clearIdempotencyRecord(entry.eventId);
    }

    await this.publisher.publish(entry.originalSubject, entry.payload);

    entry.status = "replayed";
    entry.replayedAt = new Date();
    await this.dlqRepo.save(entry);

    this.logger.log(
      `Replayed DLQ entry id=${id} eventId=${entry.eventId} to subject=${entry.originalSubject}`,
    );

    return { replayedTo: entry.originalSubject };
  }

  private async clearIdempotencyRecord(eventId: string): Promise<void> {
    const result = await this.processedEventRepo.delete({ eventId });
    if (result.affected) {
      this.logger.log(
        `Cleared idempotency record for eventId=${eventId} to allow replay`,
      );
    }
  }
}
