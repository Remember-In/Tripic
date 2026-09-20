import type { ConfigService } from "@nestjs/config";
import type { AppConfig } from "@tripic/shared";
import { readAppleConfig } from "@/config/apple-config";
import type { Env } from "@/config/env";

/**
 * 앱 동작 설정 (docs/13-operations-api-design.md §2).
 *
 * 값은 환경변수에서 읽고, 미설정 시 기본값은 env 스키마(config/env.ts)가 채운다 —
 * 기본값이 PRD 6.4 기준이라 아무것도 설정하지 않아도 정상 동작한다.
 * 반경 등을 조정할 때 재배포 대신 환경변수만 바꿔 재시작하면 된다.
 *
 * 기능 플래그는 **해당 서버 API 가 실제로 존재할 때** 켠다 — 서버에 없는 엔드포인트를
 * 앱이 노출하지 않도록 하는 게 이 스위치의 목적이다.
 * - aiDiary: 비용을 이유로 구현하지 않기로 결정 — 기본 false (docs/11 §3.2)
 * - photoUpload: 업로드·서빙·삭제 API 가 있으므로 기본 true (docs/11 §3.1)
 * - appleLogin: 플래그가 아니라 Apple env 설정 여부로 결정 — 키 없이 켤 수 없다 (docs/14 §7.1)
 */
export function buildAppConfig(config: ConfigService<Env, true>): AppConfig {
  return {
    kto: {
      defaultRadiusM: config.get("KTO_DEFAULT_RADIUS_M", { infer: true }),
      maxRadiusM: config.get("KTO_MAX_RADIUS_M", { infer: true }),
      maxCandidates: config.get("KTO_MAX_CANDIDATES", { infer: true }),
    },
    features: {
      aiDiary: config.get("FEATURE_AI_DIARY", { infer: true }),
      photoUpload: config.get("FEATURE_PHOTO_UPLOAD", { infer: true }),
      appleLogin: readAppleConfig(config) !== null,
    },
  };
}
