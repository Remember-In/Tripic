import { Controller, Get } from "@nestjs/common";

@Controller("notices")
export class NoticesController {
  /** GET /notices — 공지사항 조회 (PRD 14.2) */
  @Get()
  list() {
    // TODO(P0): 공지 데이터 소스 연결
    return [];
  }
}
