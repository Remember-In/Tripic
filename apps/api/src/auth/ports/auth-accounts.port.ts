export const AUTH_ACCOUNTS = Symbol("AuthAccounts");

export type AccountStatus = "ACTIVE" | "DELETED";

export interface AuthAccount {
  userId: string;
  nickname: string | null;
  status: AccountStatus;
}

/** 소셜 계정 ↔ 유저 조회/생성 outbound port */
export interface AuthAccounts {
  /** 카카오 계정으로 조회, 없으면 생성. 동시 가입 경합(unique 충돌)은 어댑터가 흡수한다 */
  findOrCreateByKakaoId(
    kakaoUserId: string,
  ): Promise<{ account: AuthAccount; isNewUser: boolean }>;
}
