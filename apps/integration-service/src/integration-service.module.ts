import { Module } from '@nestjs/common';
import { IntegrationServiceController } from './integration-service.controller';
import { IntegrationServiceService } from './integration-service.service';

@Module({
  imports: [],
  controllers: [IntegrationServiceController],
  providers: [IntegrationServiceService],
})
export class IntegrationServiceModule {}
