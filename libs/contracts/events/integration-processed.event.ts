export interface IntegrationProcessedEvent {
    eventId: string;
    provider: string;
    status: "processed" | "failed";
    action: string;
    summary: string;
    processedAt: string;
    data?: Record<string, unknown> | null;
    errorMessage?: string | null;
  }