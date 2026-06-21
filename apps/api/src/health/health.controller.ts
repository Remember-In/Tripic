import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  /** GET /health — 서버 상태 확인 (PRD 14.2) */
  @Get()
  check() {
    return { status: "ok" };
  }
}
