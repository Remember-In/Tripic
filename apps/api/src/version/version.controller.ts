import { Controller, Get } from "@nestjs/common";
import { Public } from "@/auth/public.decorator";

// 비위치성 운영 API — 인증 없이 공개 (전역 guard 예외)
@Public()
@Controller("version")
export class VersionController {
  /** GET /version — 앱 최소 지원 버전 조회 (PRD 14.2) */
  @Get()
  get() {
    // TODO(P0): 최소 지원 버전 정책 연결
    return {};
  }
}
