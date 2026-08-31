import { z } from "zod";

/** 카카오 access token을 Tripic 세션으로 교환한다. */
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
