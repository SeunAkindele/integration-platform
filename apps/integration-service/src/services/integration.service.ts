import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WebhookValidatedEvent } from "@libs/contracts/events/webhook-validated.event";
import { IntegrationEntity } from "../entities/integration.entity";

@Injectable()
export class IntegrationService {
  constructor(
    @InjectRepository(IntegrationEntity)
    private readonly repo: Repository<IntegrationEntity>,
  ) {}

  async markProcessing(
    event: WebhookValidatedEvent,
    action: string,
  ): Promise<void> {
    const existing = await this.repo.findOne({
      where: { eventId: event.eventId },
      order: { createdAt: "DESC" },
    });

    if (existing) {
      await this.repo.update(
        { id: existing.id },
        {
          provider: event.provider,
          action,
          status: "processing",
          payload: this.toRecord(event.payload) as any,
          receivedAt: event.receivedAt ? new Date(event.receivedAt) : null,
          validatedAt: event.validatedAt ? new Date(event.validatedAt) : null,
          errorMessage: null,
        },
      );
      return;
    }

    await this.repo.save(
      this.repo.create({
        eventId: event.eventId,
        provider: event.provider,
        action,
        status: "processing",
        payload: this.toRecord(event.payload) as any,
        receivedAt: event.receivedAt ? new Date(event.receivedAt) : null,
        validatedAt: event.validatedAt ? new Date(event.validatedAt) : null,
      }),
    );
  }

  async markProcessed(params: {
    event: WebhookValidatedEvent;
    action: string;
    summary: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const existing = await this.repo.findOne({
      where: { eventId: params.event.eventId },
      order: { createdAt: "DESC" },
    });

    if (existing) {
      await this.repo.update(
        { id: existing.id },
        {
          provider: params.event.provider,
          action: params.action,
          status: "processed",
          summary: params.summary,
          result: params.data as any,
          errorMessage: null,
          processedAt: new Date(),
        },
      );
      return;
    }

    await this.repo.save(
      this.repo.create({
        eventId: params.event.eventId,
        provider: params.event.provider,
        action: params.action,
        status: "processed",
        summary: params.summary,
        payload: this.toRecord(params.event.payload) as any,
        result: params.data as any,
        receivedAt: params.event.receivedAt
          ? new Date(params.event.receivedAt)
          : null,
        validatedAt: params.event.validatedAt
          ? new Date(params.event.validatedAt)
          : null,
        processedAt: new Date(),
      }),
    );
  }

  async markFailed(params: {
    event: WebhookValidatedEvent;
    action: string;
    errorMessage: string;
  }): Promise<void> {
    const existing = await this.repo.findOne({
      where: { eventId: params.event.eventId },
      order: { createdAt: "DESC" },
    });

    if (existing) {
      await this.repo.update(
        { id: existing.id },
        {
          provider: params.event.provider,
          action: params.action,
          status: "failed",
          errorMessage: params.errorMessage,
          processedAt: new Date(),
        },
      );
      return;
    }

    await this.repo.save(
      this.repo.create({
        eventId: params.event.eventId,
        provider: params.event.provider,
        action: params.action,
        status: "failed",
        payload: this.toRecord(params.event.payload) as any,
        errorMessage: params.errorMessage,
        receivedAt: params.event.receivedAt
          ? new Date(params.event.receivedAt)
          : null,
        validatedAt: params.event.validatedAt
          ? new Date(params.event.validatedAt)
          : null,
        processedAt: new Date(),
      }),
    );
  }

  private toRecord(payload: unknown): Record<string, unknown> | null {
    if (payload == null) return null;
    if (typeof payload !== "object" || Array.isArray(payload)) {
      return { value: payload };
    }
    return payload as Record<string, unknown>;
  }
}