import { Module } from '@nestjs/common';
import { WebhookProcessorController } from './webhook-processor.controller';
import { WebhookProcessorService } from './webhook-processor.service';

@Module({
  imports: [],
  controllers: [WebhookProcessorController],
  providers: [WebhookProcessorService],
})
export class WebhookProcessorModule {}
