import { Controller, Get } from "@nestjs/common";
import { Public } from "@/auth/public.decorator";

// 비위치성 운영 API — 인증 없이 공개 (전역 guard 예외)
@Public()
@Controller("app-config")
export class AppConfigController {
  /** GET /app-config — 앱 설정값 조회 (PRD 14.2) */
  @Get()
  get() {
    // TODO(P0): 비위치성 앱 설정값 연결
    return {};
  }
}
