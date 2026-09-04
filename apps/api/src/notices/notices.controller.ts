import { Controller, Get } from "@nestjs/common";
import { Public } from "@/auth/public.decorator";

// 비위치성 운영 API — 인증 없이 공개 (전역 guard 예외)
@Public()
@Controller("notices")
export class NoticesController {
  /** GET /notices — 공지사항 조회 (PRD 14.2) */
  @Get()
  list() {
    // TODO(P0): 공지 데이터 소스 연결
    return [];
  }
}
