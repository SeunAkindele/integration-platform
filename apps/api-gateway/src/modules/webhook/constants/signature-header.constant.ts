import { WebhookProvider } from "@libs/common/enums/webhook-provider.enum";

export const SIGNATURE_HEADER_BY_PROVIDER: Record<WebhookProvider, string> = {
    [WebhookProvider.STRIPE]: "stripe-signature",
    [WebhookProvider.GITHUB]: "x-hub-signature-256",
    [WebhookProvider.SLACK]: "x-slack-signature",
  };