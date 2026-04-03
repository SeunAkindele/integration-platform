export interface AcceptWebhookInput {
    provider: string;
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, unknown>;
    rawBody: string;
    sourceIp: string | null;
}
