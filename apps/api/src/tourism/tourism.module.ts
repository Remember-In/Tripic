import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { KTO_CLIENT } from "@/tourism/ports/kto-client.port";
import { TourismController } from "@/tourism/tourism.controller";
import { TourismService } from "@/tourism/tourism.service";
import { selectKtoClient } from "@/tourism/tourism-adapters";
import { readTourismConfig } from "@/config/tourism-config";
import type { Env } from "@/config/env";

@Module({
  controllers: [TourismController],
  providers: [
    TourismService,
    // KTO_SERVICE_KEY 가 없으면 비활성 adapter 가 붙어 /tourism 만 503 이 된다 (docs/15 §4)
    {
      provide: KTO_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        selectKtoClient(readTourismConfig(config)),
    },
  ],
})
export class TourismModule {}
