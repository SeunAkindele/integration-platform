import {
    Injectable,
    Logger,
    NotFoundException,
  } from "@nestjs/common";
  import { WebhookValidatedEvent } from "../../../../libs/contracts/events/webhook-validated.event";
  import { GithubAdapter } from "../adapters/github.adapter";
  import { SlackAdapter } from "../adapters/slack.adapter";
  import { StripeAdapter } from "../adapters/stripe.adapter";
  import { IntegrationService } from "./integration.service";
  import { IntegrationAdapterResult } from "../types/integration-adapter-result";
import { WebhookProvider } from "@libs/common/enums/webhook-provider.enum";
  
  @Injectable()
  export class IntegrationRouterService {
    private readonly logger = new Logger(IntegrationRouterService.name);
  
    constructor(
      private readonly githubAdapter: GithubAdapter,
      private readonly slackAdapter: SlackAdapter,
      private readonly stripeAdapter: StripeAdapter,
      private readonly integrationService: IntegrationService,
    ) {}
  
    async process(event: WebhookValidatedEvent): Promise<IntegrationAdapterResult> {
      const initialAction = `${event.provider}.received`;
  
      await this.integrationService.markProcessing(event, initialAction);
  
      try {
        let result: IntegrationAdapterResult;
  
        switch (event.provider) {
          case WebhookProvider.GITHUB:
            result = await this.githubAdapter.handle(event);
            break;
          case WebhookProvider.SLACK:
            result = await this.slackAdapter.handle(event);
            break;
          case WebhookProvider.STRIPE:
            result = await this.stripeAdapter.handle(event);
            break;
          default:
            throw new NotFoundException(
              `Unsupported provider: ${event.provider}`,
            );
        }
  
        await this.integrationService.markProcessed({
          event,
          action: result.action,
          summary: result.summary,
          data: result.data,
        });
  
        this.logger.log(
          `Integration processed successfully eventId=${event.eventId}, provider=${event.provider}, action=${result.action}`,
        );
  
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown integration error";
  
        await this.integrationService.markFailed({
          event,
          action: initialAction,
          errorMessage: message,
        });
  
        this.logger.error(
          `Integration processing failed eventId=${event.eventId}, provider=${event.provider}, error=${message}`,
        );
  
        throw error;
      }
    }
  }