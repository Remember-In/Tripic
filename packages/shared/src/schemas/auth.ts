import { z } from "zod";

/**
 * 카카오 소셜 로그인 요청/응답 계약 (docs/10-auth-db-design.md §6)
 * 앱(RN)과 서버(NestJS)가 같은 스키마로 검증한다.
 */

export const kakaoLoginSchema = z.object({
  kakaoAccessToken: z.string().min(1),
});
export type KakaoLoginInput = z.infer<typeof kakaoLoginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const updateMeSchema = z.object({
  nickname: z.string().trim().min(2).max(20),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

/** 인증 응답의 사용자 요약 (서버 → 앱) */
export interface AuthUser {
  id: string;
  nickname: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** access token 수명 (초) */
  expiresIn: number;
}

export interface KakaoLoginResult extends AuthTokens {
  isNewUser: boolean;
  user: AuthUser;
}
