import { createPrivateKey } from "node:crypto";
import {
  DEFAULT_RADIUS_M,
  EXPANDED_RADIUS_M,
  MAX_CANDIDATES,
} from "@tripic/shared";
import { z } from "zod";

/** 한 줄 env 로 넣은 PEM 의 `\n` 이스케이프를 실제 줄바꿈으로 되돌린다 */
const unescapeNewlines = (value: string) => value.replace(/\\n/g, "\n");

const isEcPrivateKey = (pem: string): boolean => {
  try {
    return createPrivateKey(pem).asymmetricKeyType === "ec";
  } catch {
    return false;
  }
};

/** base64 로 인코딩한 정확히 32바이트 — `openssl rand -base64 32` 출력 형식 */
const BASE64_32_BYTES = /^[A-Za-z0-9+/]{43}=$/;

/**
 * 불리언 환경변수 — `true`/`false` 두 가지만 받는다.
 * zod 의 stringbool 은 `yes`·`on`·`y`·`enabled` 까지 받아들여 표기가 제각각이 되므로 쓰지 않는다.
 * 표기를 좁혀두면 `on` 처럼 애매한 값이 조용히 통과하지 않고 부팅 단계에서 드러난다.
 */
const booleanFlag = (fallback: boolean) =>
  z
    .enum(["true", "false"])
    .default(fallback ? "true" : "false")
    .transform((value) => value === "true");

/**
 * 서버 환경변수 계약 (docs/10-auth-db-design.md §7).
 * 부팅 시 ConfigModule.validate 로 검증하며, 실패하면 즉시 기동 실패한다.
 */
export const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    /** JWT 서명 키 — 32자 이상 강제 */
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
    /** 카카오 앱 app_id — 타 카카오 앱 토큰 차단용. 필수 (미설정 시 부팅 실패) */
    KAKAO_APP_ID: z.coerce.number().int().positive(),
    /** 웹 OAuth 토큰 교환용. 미설정 시 네이티브 로그인은 유지되고 웹 로그인만 503. */
    KAKAO_CLIENT_SECRET: z.string().min(1).optional(),

    /**
     * Sign in with Apple (docs/14-apple-login-design.md §7). 5개를 전부 넣거나 전부 비운다 —
     * 전부 비우면 Apple 로그인만 비활성화된 채 기동하고(§7.1), 일부만 넣으면 부팅 실패.
     * APPLE_CLIENT_ID 는 App ID bundle id 로 identity token 의 aud 와 대조한다.
     */
    APPLE_CLIENT_ID: z.string().min(1).optional(),
    APPLE_TEAM_ID: z.string().min(1).optional(),
    APPLE_KEY_ID: z.string().min(1).optional(),
    /** Sign in with Apple 키(.p8) PEM — 파싱 불가하거나 EC 키가 아니면 부팅 실패 */
    APPLE_PRIVATE_KEY: z
      .string()
      .min(1)
      .transform(unescapeNewlines)
      .refine(
        isEcPrivateKey,
        "APPLE_PRIVATE_KEY must be an EC private key (.p8)",
      )
      .optional(),
    /** Apple refresh token 암호화 키 (AES-256-GCM, docs/14 §5) */
    SOCIAL_TOKEN_ENCRYPTION_KEY: z
      .string()
      .regex(BASE64_32_BYTES, "must be 32 bytes encoded as base64")
      .optional(),

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
    FEATURE_AI_DIARY: booleanFlag(false),
    FEATURE_PHOTO_UPLOAD: booleanFlag(true),
  })
  .superRefine((env, ctx) => {
    const values = [
      env.APPLE_CLIENT_ID,
      env.APPLE_TEAM_ID,
      env.APPLE_KEY_ID,
      env.APPLE_PRIVATE_KEY,
      env.SOCIAL_TOKEN_ENCRYPTION_KEY,
    ];
    const configured = values.filter((value) => value !== undefined).length;
    if (configured > 0 && configured < values.length) {
      ctx.addIssue({
        code: "custom",
        message:
          "APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, SOCIAL_TOKEN_ENCRYPTION_KEY must be set together or all left empty",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
