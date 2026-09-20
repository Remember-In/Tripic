export const SOCIAL_ACCOUNT_UNLINKER = Symbol("SocialAccountUnlinker");

/**
 * 회원탈퇴 전에 외부 로그인 서비스와의 연결을 끊는 outbound port (docs/14 §6).
 * 실패하면 예외를 던지고, 호출한 쪽은 사용자를 삭제하지 않는다.
 */
export interface SocialAccountUnlinker {
  unlink(userId: string): Promise<void>;
}
