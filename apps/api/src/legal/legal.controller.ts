import { Controller, Get } from "@nestjs/common";
import { Public } from "@/auth/public.decorator";

// 비위치성 운영 API — 인증 없이 공개 (전역 guard 예외)
@Public()
@Controller("legal")
export class LegalController {
  /** GET /legal/terms — 이용약관 조회 (PRD 14.2) */
  @Get("terms")
  terms() {
    // TODO(P0): 약관 콘텐츠 연결
    return {};
  }

  /** GET /legal/privacy — 개인정보 처리방침 조회 (PRD 14.2) */
  @Get("privacy")
  privacy() {
    // TODO(P0): 개인정보 처리방침 콘텐츠 연결
    return {};
  }
}
