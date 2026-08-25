import { Controller, Get } from "@nestjs/common";
import { Public } from "@/auth/public.decorator";

// 비위치성 운영 API — 인증 없이 공개 (전역 guard 예외)
@Public()
@Controller("health")
export class HealthController {
  /** GET /health — 서버 상태 확인 (PRD 14.2) */
  @Get()
  check() {
    return { status: "ok" };
  }
}
