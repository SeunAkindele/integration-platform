import { Injectable, Logger } from "@nestjs/common";
import { WebhookValidatedEvent } from "../../../../libs/contracts/events/webhook-validated.event";
import { IntegrationAdapterResult } from "../types/integration-adapter-result";

@Injectable()
export class SlackAdapter {
  private readonly logger = new Logger(SlackAdapter.name);

  async handle(event: WebhookValidatedEvent): Promise<IntegrationAdapterResult> {
    const payload = this.toRecord(event.payload);

    const action =
      this.asString(payload?.type) ||
      this.asString(payload?.event?.["type"]) ||
      "slack.unknown";

    const teamId =
      this.asString(payload?.team_id) ||
      this.asString(payload?.team) ||
      "unknown-team";

    const channel = this.asString(payload?.event?.["channel"]) || null;
    const user = this.asString(payload?.event?.["user"]) || null;

    this.logger.log(
      `Handling Slack eventId=${event.eventId}, action=${action}, teamId=${teamId}`,
    );

    return {
      action,
      summary: `Slack event processed for team ${teamId}`,
      data: {
        teamId,
        channel,
        user,
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