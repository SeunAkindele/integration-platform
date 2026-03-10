import { NestFactory } from '@nestjs/core';
import { IntegrationServiceModule } from './integration-service.module';

async function bootstrap() {
  const app = await NestFactory.create(IntegrationServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
