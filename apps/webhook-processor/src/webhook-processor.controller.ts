import { Controller, Get } from '@nestjs/common';
import { WebhookProcessorService } from './webhook-processor.service';

@Controller()
export class WebhookProcessorController {
  constructor(private readonly webhookProcessorService: WebhookProcessorService) {}

  @Get()
  getHello(): string {
    return this.webhookProcessorService.getHello();
  }
}
