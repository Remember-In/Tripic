export const APPLE_IDENTITY_VERIFIER = Symbol("AppleIdentityVerifier");

/** Apple 서버 알림의 이벤트 — type 은 Apple 이 추가할 수 있어 문자열로 둔다 (docs/14 §4) */
export interface AppleNotificationEvent {
  type: string;
  appleUserId: string;
}

/**
 * Apple 이 서명한 JWT 검증 outbound port (docs/14 §3.1·§4).
 * 서명·발급자·대상·만료 위반은 401, Apple 공개키 조회 실패는 502 (Nest 예외 의미론).
 */
export interface AppleIdentityVerifier {
  verifyIdentityToken(identityToken: string): Promise<{ appleUserId: string }>;
  verifyNotification(payload: string): Promise<AppleNotificationEvent>;
}
