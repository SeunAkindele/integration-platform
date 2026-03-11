export const WEBHOOK_SUBJECTS = {
    RECEIVED: "webhook.received.v1",
  } as const;
  
  export type WebhookSubject =
    (typeof WEBHOOK_SUBJECTS)[keyof typeof WEBHOOK_SUBJECTS];