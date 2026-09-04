import { Controller, Get, Header } from "@nestjs/common";
import type { AppConfig } from "@tripic/shared";
import { Public } from "@/auth/public.decorator";
import { APP_CONFIG } from "@/app-config/app-config.data";

// 비위치성 운영 API — 인증 없이 공개 (전역 guard 예외)
@Public()
@Controller("app-config")
export class AppConfigController {
  /** GET /app-config — 앱 설정값 조회 (PRD 14.2, docs/13 §2) */
  @Get()
  @Header("Cache-Control", "public, max-age=300")
  get(): AppConfig {
    return APP_CONFIG;
  }
}
