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

/** POST /auth/apple — 네이티브 Apple 로그인 시트가 돌려준 값을 그대로 보낸다 (docs/14 §3) */
export const appleLoginSchema = z.object({
  identityToken: z.string().min(1),
  authorizationCode: z.string().min(1),
});
export type AppleLoginInput = z.infer<typeof appleLoginSchema>;

/**
 * POST /auth/kakao/web — 카카오가 redirect 로 돌려준 authorization code 를 서버가 교환한다 (docs/15 §2).
 * 네이티브(`kakaoLoginSchema`)와 달리 앱이 access token 을 만들 수 없으므로 code 를 그대로 보낸다.
 */
export const kakaoWebLoginSchema = z.object({
  code: z.string().min(1),
  /** 카카오 인가 요청에 쓴 것과 같은 값 — 서버가 허용목록과 대조한다 */
  redirectUri: z.url(),
});
export type KakaoWebLoginInput = z.infer<typeof kakaoWebLoginSchema>;

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

/** 카카오 로그인 응답 — 공통 응답과 같다. 기존 앱 코드 호환을 위해 이름을 유지한다 */
export const kakaoLoginResultSchema = socialLoginResultSchema;
export type KakaoLoginResult = SocialLoginResult;

/**
 * 웹 세션 응답 (docs/15 §3) — refresh token 은 본문이 아니라 HttpOnly 쿠키로 내려간다.
 * 웹은 localStorage 를 쓸 수 없으므로(XSS) 본문에서 아예 제거한다.
 *
 * 주의: 스키마는 여분 키를 조용히 버리므로 "본문에 refreshToken 이 없다"는
 * parse 통과만으로 보장되지 않는다. e2e 에서 별도 단언으로 고정한다.
 */
export const webAuthTokensSchema = authTokensSchema.omit({
  refreshToken: true,
});
export type WebAuthTokens = z.infer<typeof webAuthTokensSchema>;

export const webSocialLoginResultSchema = socialLoginResultSchema.omit({
  refreshToken: true,
});
export type WebSocialLoginResult = z.infer<typeof webSocialLoginResultSchema>;

export const meSchema = authUserSchema.extend({
  /** 가입에 사용한 로그인 수단 — 설정 화면의 "카카오/Apple 계정으로 로그인됨" 표시용 */
  provider: authProviderSchema,
  createdAt: z.string().datetime(),
});
export type Me = z.infer<typeof meSchema>;
