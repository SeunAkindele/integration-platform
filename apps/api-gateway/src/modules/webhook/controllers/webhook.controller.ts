import { Body, Controller, HttpCode, HttpStatus, Param, Post, RawBodyRequest, Req } from "@nestjs/common";
import { Request } from "express";
import { WebhookService } from "../services/webhook.service";
  
@Controller("webhooks")
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) {}

    @Post(":provider")
    @HttpCode(HttpStatus.ACCEPTED)
    async receiveWebhook(
        @Param("provider") provider: string,
        @Req() req: RawBodyRequest<Request>,
        @Body() _body: unknown,
    ) {
        const rawBuffer = req.rawBody;
        const rawBody = rawBuffer ? rawBuffer.toString("utf8") : JSON.stringify(_body ?? {});

        const result = await this.webhookService.acceptWebhook({
            provider,
            path: req.originalUrl ?? req.url,
            method: req.method,
            headers: req.headers,
            query: req.query as Record<string, unknown>,
            rawBody,
            sourceIp: req.ip ?? null,
        });

        return {
            message: "Webhook accepted",
            ...result,
        };
    }
}