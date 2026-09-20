import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "@/config/env";
import { PrismaModule } from "@/prisma/prisma.module";
import { AuthModule } from "@/auth/auth.module";
import { UsersModule } from "@/users/users.module";
import { RecordsModule } from "@/records/records.module";
import { HealthModule } from "@/health/health.module";
import { AppConfigModule } from "@/app-config/app-config.module";
import { NoticesModule } from "@/notices/notices.module";
import { VersionModule } from "@/version/version.module";

/**
 * Tripic 운영 + 계정/인증 API (PRD 10.3 / 14.2, docs/10-auth-db-design.md).
 * GPS 좌표·EXIF 사진은 수신하지 않는다 — 좌표가 서버에 닿지 않는 구조가 위치정보법
 * 신고 불요 판단의 전제다 (docs/12 §3-①②).
 * KTO 원천 데이터는 저장하지 않는다 — 웹용 `/tourism` 프록시는 순수 pass-through 로
 * 키워드·지역 검색만 중계하고 응답을 DB·캐시·로그에 남기지 않는다 (docs/15 §4).
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
    RecordsModule,
    HealthModule,
    AppConfigModule,
    NoticesModule,
    VersionModule,
  ],
})
export class AppModule {}
