import { z } from "zod";

/**
 * 카카오 소셜 로그인 요청/응답 계약 (docs/10-auth-db-design.md §6)
 * 앱(RN)과 서버(NestJS)가 같은 스키마로 검증한다.
 */
export const kakaoLoginSchema = z.object({
  kakaoAccessToken: z.string().min(1),
});
export type KakaoLoginInput = z.infer<typeof kakaoLoginSchema>;

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

export const kakaoLoginResultSchema = authTokensSchema.extend({
  isNewUser: z.boolean(),
  user: authUserSchema,
});
export type KakaoLoginResult = z.infer<typeof kakaoLoginResultSchema>;

export const meSchema = authUserSchema.extend({
  createdAt: z.string().datetime(),
});
export type Me = z.infer<typeof meSchema>;
