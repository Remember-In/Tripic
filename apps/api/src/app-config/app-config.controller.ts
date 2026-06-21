import { Controller, Get } from "@nestjs/common";

@Controller("app-config")
export class AppConfigController {
  /** GET /app-config — 앱 설정값 조회 (PRD 14.2) */
  @Get()
  get() {
    // TODO(P0): 비위치성 앱 설정값 연결
    return {};
  }
}
