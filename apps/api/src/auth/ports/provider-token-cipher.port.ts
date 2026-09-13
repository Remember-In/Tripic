export const PROVIDER_TOKEN_CIPHER = Symbol("ProviderTokenCipher");

/** provider 가 발급한 비밀(Apple refresh token) 암복호화 port (docs/14 §5) */
export interface ProviderTokenCipher {
  encrypt(plaintext: string): string;
  /** 형식·키·무결성 검증에 실패하면 500 — 운영자가 키 설정을 바로잡아야 하는 장애다 */
  decrypt(sealed: string): string;
}
