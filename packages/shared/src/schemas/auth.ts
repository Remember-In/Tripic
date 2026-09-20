import { z } from "zod";

/**
 * 소셜 로그인(카카오·Apple) 요청/응답 계약 (docs/10-auth-db-design.md §6, docs/14-apple-login-design.md)
 * 앱(RN)과 서버(NestJS)가 같은 스키마로 검증한다.
 */
export const authProviderSchema = z.enum(["KAKAO", "APPLE"]);
export type AuthProvider = z.infer<typeof authProviderSchema>;

export const kakaoLoginSchema = z.object({
  kakaoAccessToken: z.string().min(1),
});
export type KakaoLoginInput = z.infer<typeof kakaoLoginSchema>;

/** POST /auth/kakao/web — Kakao OAuth authorization code 교환 */
export const kakaoWebLoginSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
  /** 카카오 REST API 키는 OAuth client_id로 사용하는 공개 식별자다. */
  restApiKey: z.string().min(1),
});
export type KakaoWebLoginInput = z.infer<typeof kakaoWebLoginSchema>;

/** POST /auth/apple — 네이티브 Apple 로그인 시트가 돌려준 값을 그대로 보낸다 (docs/14 §3) */
export const appleLoginSchema = z.object({
  identityToken: z.string().min(1),
  authorizationCode: z.string().min(1),
});
export type AppleLoginInput = z.infer<typeof appleLoginSchema>;

/** POST /auth/apple/notifications — Apple 서버가 보내는 서명된 알림 (docs/14 §4) */
export const appleNotificationSchema = z.object({
  payload: z.string().min(1),
});
export type AppleNotificationInput = z.infer<typeof appleNotificationSchema>;

/** refresh rotation 및 로그아웃 요청에 사용하는 계약이다. */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const updateMeSchema = z.object({
  nickname: z.string().trim().min(2).max(20),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

/** 인증 응답의 사용자 요약 (서버 → 앱) */
export const authUserSchema = z.object({
  id: z.string().min(1),
  nickname: z.string().nullable(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  /** access token 수명(초) */
  expiresIn: z.number().int().positive(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

/** 카카오·Apple 로그인이 공통으로 돌려주는 세션 응답 */
export const socialLoginResultSchema = authTokensSchema.extend({
  isNewUser: z.boolean(),
  user: authUserSchema,
});
export type SocialLoginResult = z.infer<typeof socialLoginResultSchema>;

/** 웹에는 refresh token을 본문으로 노출하지 않고 HttpOnly cookie로만 전달한다. */
export type WebLoginResult = Omit<SocialLoginResult, "refreshToken">;
export type WebRefreshResult = Omit<AuthTokens, "refreshToken">;

/** 카카오 로그인 응답 — 공통 응답과 같다. 기존 앱 코드 호환을 위해 이름을 유지한다 */
export const kakaoLoginResultSchema = socialLoginResultSchema;
export type KakaoLoginResult = SocialLoginResult;

export const meSchema = authUserSchema.extend({
  /** 가입에 사용한 로그인 수단 — 설정 화면의 "카카오/Apple 계정으로 로그인됨" 표시용 */
  provider: authProviderSchema,
  createdAt: z.string().datetime(),
});
export type Me = z.infer<typeof meSchema>;
