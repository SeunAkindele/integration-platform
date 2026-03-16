export interface IntegrationCommandEvent {
    eventId: string;
    provider: string;
    command: string;
    payload: unknown;
    createdAt: string;
  }