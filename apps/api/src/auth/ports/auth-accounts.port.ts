import type { AuthProvider } from "@tripic/shared";

export const AUTH_ACCOUNTS = Symbol("AuthAccounts");

export interface AuthAccount {
  userId: string;
  nickname: string | null;
}

/** 소셜 로그인 수단 + 그 수단이 발급한 사용자 식별자 (카카오 user id, Apple sub) */
export interface SocialIdentity {
  provider: AuthProvider;
  providerUserId: string;
}

/** 소셜 계정 ↔ 유저 조회/생성 outbound port */
export interface AuthAccounts {
  /** 소셜 계정으로 조회, 없으면 생성. 동시 가입 경합(unique 충돌)은 어댑터가 흡수한다 */
  findOrCreateBySocial(
    identity: SocialIdentity,
  ): Promise<{ account: AuthAccount; isNewUser: boolean }>;
  /** 연결된 사용자 id. 가입한 적 없거나 이미 탈퇴했으면 null */
  findUserIdBySocial(identity: SocialIdentity): Promise<string | null>;
  /** 사용자 hard delete (멱등) — 연관 데이터는 FK cascade 로 함께 파기된다 */
  deleteUser(userId: string): Promise<void>;
}
