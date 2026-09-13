export const APPLE_AUTH_CLIENT = Symbol("AppleAuthClient");

/** Apple REST API(`/auth/token`, `/auth/revoke`) outbound port (docs/14 §3·§6) */
export interface AppleAuthClient {
  /**
   * authorization code 를 refresh token 으로 교환한다.
   * 만료·재사용된 code(`invalid_grant`)는 401, 그 외 Apple 오류·장애는 502.
   */
  exchangeAuthorizationCode(
    authorizationCode: string,
  ): Promise<{ refreshToken: string; appleUserId: string }>;
  /** refresh token 폐기. Apple 이 이미 무효한 토큰이라고 답하면 성공으로 본다. 장애는 502 */
  revokeRefreshToken(refreshToken: string): Promise<void>;
}
