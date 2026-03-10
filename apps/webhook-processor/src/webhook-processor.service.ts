import { Injectable } from '@nestjs/common';

@Injectable()
export class WebhookProcessorService {
  getHello(): string {
    return 'Hello World!';
  }
}
