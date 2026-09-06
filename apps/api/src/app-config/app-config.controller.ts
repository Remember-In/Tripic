import { Controller, Get, Header } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "@tripic/shared";
import { Public } from "@/auth/public.decorator";
import { buildAppConfig } from "@/app-config/app-config.data";
import type { Env } from "@/config/env";

// 비위치성 운영 API — 인증 없이 공개 (전역 guard 예외)
@Public()
@Controller("app-config")
export class AppConfigController {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /** GET /app-config — 앱 설정값 조회 (PRD 14.2, docs/13 §2) */
  @Get()
  @Header("Cache-Control", "public, max-age=300")
  get(): AppConfig {
    return buildAppConfig(this.config);
  }
}
