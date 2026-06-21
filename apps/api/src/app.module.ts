import { Module } from "@nestjs/common";
import { HealthModule } from "@/health/health.module";
import { AppConfigModule } from "@/app-config/app-config.module";
import { NoticesModule } from "@/notices/notices.module";
import { LegalModule } from "@/legal/legal.module";
import { VersionModule } from "@/version/version.module";

/**
 * Tripic 비위치성 운영 API (PRD 10.3 / 14.2).
 * GPS 좌표·EXIF 사진·방문 기록을 수신/저장하지 않으며 DB/ORM을 사용하지 않는다.
 */
@Module({
  imports: [
    HealthModule,
    AppConfigModule,
    NoticesModule,
    LegalModule,
    VersionModule,
  ],
})
export class AppModule {}
