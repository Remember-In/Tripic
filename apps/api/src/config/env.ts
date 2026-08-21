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
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
