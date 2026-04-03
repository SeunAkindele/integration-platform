import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JetStreamService } from "./jetstream.service";
import { Publisher } from "./publisher";
import { ConsumerFactory } from "./consumer.factory";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [JetStreamService, Publisher, ConsumerFactory],
  exports: [JetStreamService, Publisher, ConsumerFactory],
})
export class NatsModule {}