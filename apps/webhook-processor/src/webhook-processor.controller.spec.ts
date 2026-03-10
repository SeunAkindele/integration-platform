import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessorController } from './webhook-processor.controller';
import { WebhookProcessorService } from './webhook-processor.service';

describe('WebhookProcessorController', () => {
  let webhookProcessorController: WebhookProcessorController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WebhookProcessorController],
      providers: [WebhookProcessorService],
    }).compile();

    webhookProcessorController = app.get<WebhookProcessorController>(WebhookProcessorController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(webhookProcessorController.getHello()).toBe('Hello World!');
    });
  });
});
