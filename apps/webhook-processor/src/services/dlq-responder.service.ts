import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JSONCodec, Subscription } from "nats";
import { JetStreamService } from "@libs/messaging/jetstream.service";
import { Publisher } from "@libs/messaging/publisher";
import { SUBJECTS } from "@libs/contracts/subjects";
import { DeadLetterEventEntity } from "../entities/dead-letter-event.entity";
import { ProcessedEventEntity } from "../entities/processed-event.entity";
import {
  DlqListRequest,
  DlqFindOneRequest,
  DlqUpdatePayloadRequest,
  DlqReplayRequest,
  DlqEntryResponse,
  DlqReplayResponse,
  DlqErrorResponse,
} from "@libs/contracts/events/dlq-request.event";

@Injectable()
export class DlqResponderService implements OnModuleInit {
  private readonly logger = new Logger(DlqResponderService.name);
  private readonly json = JSONCodec();
  private readonly subscriptions: Subscription[] = [];

  constructor(
    @InjectRepository(DeadLetterEventEntity)
    private readonly dlqRepo: Repository<DeadLetterEventEntity>,
    @InjectRepository(ProcessedEventEntity)
    private readonly processedEventRepo: Repository<ProcessedEventEntity>,
    private readonly jetStreamService: JetStreamService,
    private readonly publisher: Publisher,
  ) {}

  async onModuleInit() {
    const nc = this.jetStreamService.getConnection();

    this.subscriptions.push(
      nc.subscribe(SUBJECTS.DLQ_RPC_LIST, {
        callback: (err, msg) => this.handleSafe(err, msg, (data) => this.list(data)),
      }),
      nc.subscribe(SUBJECTS.DLQ_RPC_FIND_ONE, {
        callback: (err, msg) => this.handleSafe(err, msg, (data) => this.findOne(data)),
      }),
      nc.subscribe(SUBJECTS.DLQ_RPC_UPDATE_PAYLOAD, {
        callback: (err, msg) => this.handleSafe(err, msg, (data) => this.updatePayload(data)),
      }),
      nc.subscribe(SUBJECTS.DLQ_RPC_REPLAY, {
        callback: (err, msg) => this.handleSafe(err, msg, (data) => this.replay(data)),
      }),
    );

    this.logger.log("DLQ RPC responder subscriptions active");
  }

  private async handleSafe(err: any, msg: any, handler: (data: any) => Promise<any>) {
    if (err) {
      this.logger.error(`Subscription error: ${err.message}`);
      return;
    }

    try {
      const data = msg.data.length > 0 ? this.json.decode(msg.data) : {};
      const result = await handler(data);
      msg.respond(this.json.encode(result));
    } catch (error: any) {
      const statusCode = error.status ?? 500;
      const response: DlqErrorResponse = {
        error: error.message ?? "Internal error",
        statusCode,
      };
      msg.respond(this.json.encode(response));
    }
  }

  private async list(req: DlqListRequest): Promise<DlqEntryResponse[]> {
    const where = req.status ? { status: req.status } : {};
    const entries = await this.dlqRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
    return entries.map(this.toResponse);
  }

  private async findOne(req: DlqFindOneRequest): Promise<DlqEntryResponse> {
    const entry = await this.dlqRepo.findOne({ where: { id: req.id } });
    if (!entry) {
      throw Object.assign(new Error(`DLQ entry ${req.id} not found`), { status: 404 });
    }
    return this.toResponse(entry);
  }

  private async updatePayload(req: DlqUpdatePayloadRequest): Promise<DlqEntryResponse> {
    const entry = await this.dlqRepo.findOne({ where: { id: req.id } });
    if (!entry) {
      throw Object.assign(new Error(`DLQ entry ${req.id} not found`), { status: 404 });
    }
    entry.payload = req.payload;
    entry.status = "pending";
    entry.replayedAt = null;
    const saved = await this.dlqRepo.save(entry);
    return this.toResponse(saved);
  }

  private async replay(req: DlqReplayRequest): Promise<DlqReplayResponse> {
    const entry = await this.dlqRepo.findOne({ where: { id: req.id } });
    if (!entry) {
      throw Object.assign(new Error(`DLQ entry ${req.id} not found`), { status: 404 });
    }
    if (entry.status === "replayed") {
      throw Object.assign(new Error(`DLQ entry ${req.id} has already been replayed`), { status: 400 });
    }

    if (entry.eventId) {
      const result = await this.processedEventRepo.delete({ eventId: entry.eventId });
      if (result.affected) {
        this.logger.log(`Cleared idempotency record for eventId=${entry.eventId} to allow replay`);
      }
    }

    await this.publisher.publish(entry.originalSubject, entry.payload);

    entry.status = "replayed";
    entry.replayedAt = new Date();
    await this.dlqRepo.save(entry);

    this.logger.log(
      `Replayed DLQ entry id=${req.id} eventId=${entry.eventId} to subject=${entry.originalSubject}`,
    );

    return { replayedTo: entry.originalSubject };
  }

  private toResponse(entity: DeadLetterEventEntity): DlqEntryResponse {
    return {
      id: entity.id,
      eventId: entity.eventId,
      originalSubject: entity.originalSubject,
      originalStream: entity.originalStream,
      originalSequence: entity.originalSequence,
      failedConsumer: entity.failedConsumer,
      deadLetterReason: entity.deadLetterReason,
      payload: entity.payload,
      status: entity.status,
      deadLetteredAt: entity.deadLetteredAt.toISOString(),
      replayedAt: entity.replayedAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
