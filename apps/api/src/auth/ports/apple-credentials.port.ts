export const APPLE_CREDENTIALS = Symbol("AppleCredentials");

/**
 * Apple 전용 자격 증명(암호화된 refresh token) 영속화 outbound port (docs/14 §5).
 * 값은 이미 암호화된 문자열이다 — 암복호화는 ProviderTokenCipher 의 책임.
 */
export interface AppleCredentials {
  /** 해당 Apple 계정의 자격 증명을 저장한다. 이미 있으면 교체 */
  saveForAppleUser(
    appleUserId: string,
    sealedRefreshToken: string,
  ): Promise<void>;
  /** 사용자의 Apple 자격 증명. Apple 계정이 아니거나 없으면 null */
  findSealedByUserId(userId: string): Promise<string | null>;
  /** 해당 Apple 계정의 자격 증명 삭제 (멱등) */
  deleteForAppleUser(appleUserId: string): Promise<void>;
}
