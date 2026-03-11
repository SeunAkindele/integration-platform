export class WebhookReceivedEventDto {
    eventId!: string;
    provider!: string;
    receivedAt!: string;
    path!: string;
    method!: string;
    headers!: Record<string, string | string[] | undefined>;
    query!: Record<string, unknown>;
    rawBody!: string;
    sourceIp!: string | null;
  }