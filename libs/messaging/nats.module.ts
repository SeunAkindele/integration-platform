import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { NATS_SERVICE } from "./nats.service";

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: NATS_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const servers = (configService.get<string>("NATS_SERVERS") ?? "nats://localhost:4222")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);

          return {
            transport: Transport.NATS,
            options: {
              servers,
            },
          };
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class NatsModule {}