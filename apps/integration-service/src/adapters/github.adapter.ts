import { Injectable, Logger } from "@nestjs/common";
import { WebhookValidatedEvent } from "@libs/contracts/events/webhook-validated.event";
import { IntegrationAdapterResult } from "../types/integration-adapter-result";

@Injectable()
export class GithubAdapter {
  private readonly logger = new Logger(GithubAdapter.name);

  async handle(event: WebhookValidatedEvent): Promise<IntegrationAdapterResult> {
    const payload = this.toRecord(event.payload);

    const action =
      this.asString(payload?.action) ||
      this.asString(payload?.["event"]) ||
      "github.unknown";

    const repository =
      this.asString(payload?.repository?.["full_name"]) || "unknown-repository";

    const sender = this.asString(payload?.sender?.["login"]) || null;

    this.logger.log(
      `Handling GitHub eventId=${event.eventId}, action=${action}, repository=${repository}`,
    );

    return {
      action,
      summary: `GitHub event processed for repository ${repository}`,
      data: {
        repository,
        sender,
      },
    };
  }

  private toRecord(payload: unknown): Record<string, any> {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { value: payload };
    }
    return payload as Record<string, any>;
  }

  private asString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
  }
}