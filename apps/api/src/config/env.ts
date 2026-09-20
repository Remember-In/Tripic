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
 * redirect uri 허용목록에 담을 수 있는 값인지 확인한다.
 * URL 형식만 보면 `javascript:` 같은 스킴이 통과하므로 http(s) 로 좁힌다.
 */
const isHttpUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * 한 기능의 자격증명 묶음은 전부 설정하거나 전부 비워야 한다.
 * 일부만 설정된 상태는 "꺼짐"과 구분되지 않아 조용히 오작동하므로 부팅 단계에서 막는다.
 */
const isAllOrNone = (values: readonly unknown[]): boolean => {
  const configured = values.filter((value) => value !== undefined).length;
  return configured === 0 || configured === values.length;
};

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

    /**
     * 웹 카카오 로그인 (docs/15 §2). REST 키와 redirect uri 허용목록을 전부 넣거나 전부 비운다 —
     * 전부 비우면 웹 카카오 로그인만 비활성화된 채 기동하고, 일부만 넣으면 부팅 실패.
     * REST 키는 KAKAO_APP_ID 와 **같은 카카오 애플리케이션**의 것이어야 한다.
     * 다른 앱의 키를 넣으면 교환한 토큰이 access_token_info 의 app_id 대조에서 걸려 401 이 된다.
     */
    KAKAO_WEB_REST_API_KEY: z.string().min(1).optional(),
    /**
     * 쉼표로 구분한 허용목록 — 운영 도메인과 로컬 Vite 를 함께 담는다.
     * 웹이 보낸 redirect_uri 를 이 목록과 대조해, 공격자가 임의 주소로 code 를 교환하지 못하게 한다.
     */
    KAKAO_WEB_REDIRECT_URIS: z
      .string()
      .min(1)
      .transform((value) =>
        value
          .split(",")
          .map((uri) => uri.trim())
          .filter((uri) => uri.length > 0),
      )
      .refine(
        (uris) => uris.length > 0,
        "KAKAO_WEB_REDIRECT_URIS must contain at least one redirect uri",
      )
      .refine(
        (uris) => uris.every(isHttpUrl),
        "KAKAO_WEB_REDIRECT_URIS must contain only http(s) urls",
      )
      .optional(),
    /** 카카오 콘솔에서 Client Secret 을 활성화한 경우에만 설정한다 */
    KAKAO_WEB_CLIENT_SECRET: z.string().min(1).optional(),

    /**
     * TourAPI 서버 프록시 서비스키 (docs/15 §4). 비우면 /tourism 만 503 으로 꺼진 채 기동한다.
     * 공공데이터포털 일반 인증키의 디코딩 값을 권장한다 — 인코딩 값이어도 한 번 디코딩해 쓴다.
     */
    KTO_SERVICE_KEY: z.string().min(1).optional(),

    /**
     * 이미지 빌드 시 새겨지는 값 (Dockerfile ARG → ENV). 로컬 실행에는 없다.
     * GET /health 로 노출해 "지금 어느 빌드가 떠 있는가" 를 밖에서 확인할 수 있게 한다 —
     * 라우트가 늘지 않는 패치 릴리스는 다른 방법으로 구분되지 않는다.
     */
    APP_VERSION: z.string().min(1).optional(),
    COMMIT_SHA: z.string().min(1).optional(),

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
    if (
      !isAllOrNone([
        env.APPLE_CLIENT_ID,
        env.APPLE_TEAM_ID,
        env.APPLE_KEY_ID,
        env.APPLE_PRIVATE_KEY,
        env.SOCIAL_TOKEN_ENCRYPTION_KEY,
      ])
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, SOCIAL_TOKEN_ENCRYPTION_KEY must be set together or all left empty",
      });
    }

    if (
      !isAllOrNone([env.KAKAO_WEB_REST_API_KEY, env.KAKAO_WEB_REDIRECT_URIS])
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "KAKAO_WEB_REST_API_KEY, KAKAO_WEB_REDIRECT_URIS must be set together or all left empty",
      });
    }

    // client secret 은 카카오 콘솔에서 켰을 때만 필요한 선택 항목이라 위 묶음에 넣지 않는다.
    // 다만 REST 키 없이 홀로 남으면 쓰이지 못한 채 설정만 남으므로 설정 실수로 본다.
    if (
      env.KAKAO_WEB_CLIENT_SECRET !== undefined &&
      env.KAKAO_WEB_REST_API_KEY === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "KAKAO_WEB_CLIENT_SECRET requires KAKAO_WEB_REST_API_KEY",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
