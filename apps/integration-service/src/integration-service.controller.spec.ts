import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationServiceController } from './integration-service.controller';
import { IntegrationServiceService } from './integration-service.service';

describe('IntegrationServiceController', () => {
  let integrationServiceController: IntegrationServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationServiceController],
      providers: [IntegrationServiceService],
    }).compile();

    integrationServiceController = app.get<IntegrationServiceController>(IntegrationServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(integrationServiceController.getHello()).toBe('Hello World!');
    });
  });
});
