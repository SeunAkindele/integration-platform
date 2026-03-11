import { NestFactory } from '@nestjs/core';
import { WebhookProcessorModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(WebhookProcessorModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
