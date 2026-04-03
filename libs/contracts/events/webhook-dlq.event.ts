export interface WebhookDlqEvent {
    originalSubject: string;
    originalStream: string;
    originalSequence: number;
    failedConsumer: string;
    deadLetterReason: "max_deliver_exceeded";
    payload: unknown;
    deadLetteredAt: string;
  }