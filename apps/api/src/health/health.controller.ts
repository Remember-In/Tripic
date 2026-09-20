import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "@/auth/public.decorator";
import type { Env } from "@/config/env";

interface HealthStatus {
  status: "ok";
  /** 이미지에 새겨진 릴리스 버전. 빌드 인자 없이 띄운 로컬에서는 null */
  version: string | null;
  commit: string | null;
}

// 비위치성 운영 API — 인증 없이 공개 (전역 guard 예외)
@Public()
@Controller("health")
export class HealthController {
  private readonly build: Pick<HealthStatus, "commit" | "version">;

  constructor(config: ConfigService<Env, true>) {
    this.build = {
      version: config.get("APP_VERSION", { infer: true }) ?? null,
      commit: config.get("COMMIT_SHA", { infer: true }) ?? null,
    };
  }

  /**
   * GET /health — 서버 상태 + 떠 있는 빌드 (PRD 14.2).
   *
   * 버전을 함께 내려주는 이유: 라우트를 늘리지 않는 패치 릴리스는 매핑된 라우트 목록으로
   * 구분되지 않아, 배포가 실제로 반영됐는지 밖에서 확인할 방법이 없었다.
   */
  @Get()
  check(): HealthStatus {
    return { status: "ok", ...this.build };
  }
}
