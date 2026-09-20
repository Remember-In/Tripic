import type { AuthProvider } from "@tripic/shared";

export const USERS_REPOSITORY = Symbol("UsersRepository");

export interface UserProfile {
  id: string;
  nickname: string | null;
  /** 가입에 사용한 로그인 수단 — 계정 연결을 지원하지 않아 사용자당 하나다 */
  provider: AuthProvider;
  createdAt: Date;
}

/**
 * 사용자 프로필 outbound port.
 * 탈퇴는 hard delete 라 "삭제된 사용자" 상태가 존재하지 않는다 — 행이 있으면 유효한 사용자다.
 */
export interface UsersRepository {
  findById(userId: string): Promise<UserProfile | null>;
  updateNickname(
    userId: string,
    nickname: string,
  ): Promise<{ id: string; nickname: string | null }>;
  /** 행 삭제. 이미 없으면 조용히 넘어간다 (멱등) — 연관 데이터는 FK cascade 로 함께 파기된다 */
  deleteById(userId: string): Promise<void>;
}
