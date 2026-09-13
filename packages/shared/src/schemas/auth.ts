import { z } from "zod";

export const authProviderSchema = z.enum(["KAKAO", "APPLE"]);
export type AuthProvider = z.infer<typeof authProviderSchema>;

/** 소셜 로그인 요청/응답 계약. 앱과 서버가 같은 스키마로 검증한다. */
export const kakaoLoginSchema = z.object({
  kakaoAccessToken: z.string().min(1),
});
export type KakaoLoginInput = z.infer<typeof kakaoLoginSchema>;

export const appleLoginSchema = z.object({
  identityToken: z.string().min(1),
  authorizationCode: z.string().min(1),
});
export type AppleLoginInput = z.infer<typeof appleLoginSchema>;

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

export const socialLoginResultSchema = authTokensSchema.extend({
  isNewUser: z.boolean(),
  user: authUserSchema,
});
export type SocialLoginResult = z.infer<typeof socialLoginResultSchema>;
export const kakaoLoginResultSchema = socialLoginResultSchema;
export type KakaoLoginResult = SocialLoginResult;

export const meSchema = authUserSchema.extend({
  provider: authProviderSchema,
  createdAt: z.string().datetime(),
});
export type Me = z.infer<typeof meSchema>;
