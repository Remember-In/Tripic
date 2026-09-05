import {
  DEFAULT_RADIUS_M,
  EXPANDED_RADIUS_M,
  MAX_CANDIDATES,
} from "@tripic/shared";
import { z } from "zod";

/**
 * 서버 환경변수 계약 (docs/10-auth-db-design.md §7).
 * 부팅 시 ConfigModule.validate 로 검증하며, 실패하면 즉시 기동 실패한다.
 */
export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /** JWT 서명 키 — 32자 이상 강제 */
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** 카카오 앱 app_id — 타 카카오 앱 토큰 차단용. 필수 (미설정 시 부팅 실패) */
  KAKAO_APP_ID: z.coerce.number().int().positive(),
  PORT: z.coerce.number().int().default(3000),

  /**
   * GET /app-config 로 앱에 내려주는 값 (docs/13 §2).
   * 기본값은 PRD 6.4 기준이고, 배포 없이 조정하려면 환경변수로 덮는다.
   */
  KTO_DEFAULT_RADIUS_M: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_RADIUS_M),
  KTO_MAX_RADIUS_M: z.coerce
    .number()
    .int()
    .positive()
    .default(EXPANDED_RADIUS_M),
  KTO_MAX_CANDIDATES: z.coerce
    .number()
    .int()
    .positive()
    .default(MAX_CANDIDATES),
  /** 기능 노출 스위치 — 해당 서버 API 가 있을 때만 켠다 */
  FEATURE_AI_DIARY: z.stringbool().default(false),
  FEATURE_PHOTO_UPLOAD: z.stringbool().default(true),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
