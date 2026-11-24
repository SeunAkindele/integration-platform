import { Injectable, Logger } from "@nestjs/common";
import { WebhookValidatedEvent } from "@libs/contracts/events/webhook-validated.event";
import { IntegrationAdapterResult } from "../types/integration-adapter-result";

@Injectable()
export class SlackAdapter {
  private readonly logger = new Logger(SlackAdapter.name);

  async handle(event: WebhookValidatedEvent): Promise<IntegrationAdapterResult> {
    const payload = this.toRecord(event.payload);
    // Events API wraps the real event: { type: "event_callback", event: { type: "message", ... } }
    const inner = this.toRecord(payload?.event);

    const eventType = this.asString(inner?.type);
    const subtype = this.asString(inner?.subtype);

    // Prefer the inner event type (message, app_mention); add subtype when present
    // (e.g. message.channel_join). Fall back to the envelope type for non-event payloads.
    const action =
      (eventType && (subtype ? `${eventType}.${subtype}` : eventType)) ||
      this.asString(payload?.type) ||
      "slack.unknown";

    const teamId =
      this.asString(payload?.team_id) ||
      this.asString(inner?.team) ||
      "unknown-team";

    const channel = this.asString(inner?.channel);
    const channelType = this.asString(inner?.channel_type);
    const user = this.asString(inner?.user);
    const text = this.asString(inner?.text);
    const ts = this.asString(inner?.ts);
    const slackEventId = this.asString(payload?.event_id);

    this.logger.log(
      `Handling Slack eventId=${event.eventId}, action=${action}, teamId=${teamId}, channel=${channel}`,
    );

    return {
      action,
      summary: channel
        ? `Slack ${action} in channel ${channel} for team ${teamId}`
        : `Slack event processed for team ${teamId}`,
      data: {
        teamId,
        channel,
        channelType,
        user,
        text,
        ts,
        slackEventId,
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