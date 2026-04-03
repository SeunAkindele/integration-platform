export interface WebhookValidatedEvent {
    eventId: string;
    provider: string;
    receivedAt: string;
    validatedAt: string;
    payload: unknown;
  }