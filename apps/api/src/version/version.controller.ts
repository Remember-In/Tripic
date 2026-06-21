import { Controller, Get } from "@nestjs/common";

@Controller("version")
export class VersionController {
  /** GET /version — 앱 최소 지원 버전 조회 (PRD 14.2) */
  @Get()
  get() {
    // TODO(P0): 최소 지원 버전 정책 연결
    return {};
  }
}
