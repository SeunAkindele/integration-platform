import { BadRequestException, Body, Controller, HttpCode, HttpStatus, NotFoundException, Param, Post, RawBodyRequest, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { WebhookProvider } from "@libs/common/enums/webhook-provider.enum";
import { WebhookService } from "../services/webhook.service";

const SUPPORTED_PROVIDERS = new Set<string>(Object.values(WebhookProvider));

@Controller("webhooks")
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) {}

    @Post(":provider")
    @HttpCode(HttpStatus.ACCEPTED)
    async receiveWebhook(
        @Param("provider") provider: string,
        @Req() req: RawBodyRequest<Request>,
        @Body() _body: unknown,
        @Res({ passthrough: true }) res: Response,
    ) {
        // Reject typos like /webhooks/slac instead of silently queueing them.
        const normalizedProvider = provider.toLowerCase();
        if (!SUPPORTED_PROVIDERS.has(normalizedProvider)) {
            throw new NotFoundException(`Unsupported webhook provider: ${provider}`);
        }

        // Slack's Request URL handshake: echo the challenge back with HTTP 200.
        if (
            normalizedProvider === WebhookProvider.SLACK &&
            typeof _body === "object" &&
            _body !== null &&
            (_body as Record<string, unknown>).type === "url_verification"
        ) {
            res.status(HttpStatus.OK);
            return { challenge: (_body as Record<string, unknown>).challenge };
        }

        const rawBuffer = req.rawBody;
        // Stripe signs the exact request bytes, so a re-serialized body can never verify.
        // Reject instead of falling back (e.g. a content type Nest has no raw parser for).
        if (!rawBuffer && normalizedProvider === WebhookProvider.STRIPE) {
            throw new BadRequestException(
                "Stripe webhooks must be sent as application/json so the raw body can be verified",
            );
        }
        const rawBody = rawBuffer ? rawBuffer.toString("utf8") : JSON.stringify(_body ?? {});

        const result = await this.webhookService.acceptWebhook({
            provider: normalizedProvider,
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