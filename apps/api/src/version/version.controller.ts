import { Controller, Get, Header } from "@nestjs/common";
import type { VersionInfo } from "@tripic/shared";
import { Public } from "@/auth/public.decorator";
import { VERSION_INFO } from "@/version/version.data";

// 비위치성 운영 API — 인증 없이 공개 (전역 guard 예외)
@Public()
@Controller("version")
export class VersionController {
  /** GET /version — 앱 최소 지원 버전 조회 (PRD 14.2, docs/13 §2) */
  @Get()
  @Header("Cache-Control", "public, max-age=300")
  get(): VersionInfo {
    return VERSION_INFO;
  }
}
