import { Controller, Get, Header } from "@nestjs/common";
import type { Notice } from "@tripic/shared";
import { Public } from "@/auth/public.decorator";
import { NOTICES } from "@/notices/notices.data";

// 비위치성 운영 API — 인증 없이 공개 (전역 guard 예외)
@Public()
@Controller("notices")
export class NoticesController {
  /** GET /notices — 공지사항 조회 (PRD 14.2, docs/13 §2 — publishedAt 내림차순) */
  @Get()
  @Header("Cache-Control", "public, max-age=300")
  list(): readonly Notice[] {
    return NOTICES;
  }
}
