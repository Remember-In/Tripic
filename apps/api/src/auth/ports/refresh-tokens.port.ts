export const REFRESH_TOKENS = Symbol("RefreshTokens");

export interface StoredRefreshToken {
  id: string;
  familyId: string;
  userId: string;
  /** revokedAt 또는 replacedById 가 설정됨 — 사용 불가 상태 */
  revoked: boolean;
  expiresAt: Date;
}

export interface NewRefreshToken {
  tokenHash: string;
  familyId: string;
  userId: string;
  expiresAt: Date;
}

/** refresh 토큰 영속화 outbound port — rotation 원자성은 어댑터가 보장한다 */
export interface RefreshTokens {
  findByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  /**
   * 살아 있는 세션인지 확인한다 — access token 검증에 쓴다 (docs/10 §3).
   *
   * 로그아웃하면 family 가 revoke 되고, 탈퇴하면 cascade 로 행이 사라지므로 둘 다 null 이 된다.
   * 인증 요청마다 호출되므로 `@@index([familyId])` 를 타는 단일 조회여야 한다.
   */
  findActiveByFamily(familyId: string): Promise<{ userId: string } | null>;
  issue(token: NewRefreshToken): Promise<void>;
  /** 기존 토큰이 미사용 상태일 때만 원자적으로 교체. 동시 refresh 경합이면 false */
  rotate(currentId: string, replacement: NewRefreshToken): Promise<boolean>;
  revokeFamily(familyId: string): Promise<void>;
  /** 사용자의 모든 기기 세션 폐기 (멱등) — Apple 연결 해제 알림 처리용 */
  revokeAllForUser(userId: string): Promise<void>;
}
