import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "@/config/env";
import { PrismaModule } from "@/prisma/prisma.module";
import { AuthModule } from "@/auth/auth.module";
import { UsersModule } from "@/users/users.module";
import { HealthModule } from "@/health/health.module";
import { AppConfigModule } from "@/app-config/app-config.module";
import { NoticesModule } from "@/notices/notices.module";
import { VersionModule } from "@/version/version.module";

/**
 * Tripic 운영 + 계정/인증 API (PRD 10.3 / 14.2, docs/10-auth-db-design.md).
 * GPS 좌표·EXIF 사진·KTO 원천 데이터를 수신/저장하지 않는다.
 * DB(PostgreSQL + Prisma)는 계정/인증 및 사용자 확정 여행 기록 스키마에 한정하며,
 * 방문 관광지(record_places) API 노출은 위치정보지원센터 사전 검토 후에만 한다
 * (기록 콘텐츠 API는 대상 아님 — docs/11-records-api-design.md).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    AppConfigModule,
    NoticesModule,
    VersionModule,
  ],
})
export class AppModule {}
