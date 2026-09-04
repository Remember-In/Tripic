export const USERS_REPOSITORY = Symbol("UsersRepository");

export interface UserProfile {
  id: string;
  nickname: string | null;
  createdAt: Date;
}

/** 사용자 프로필 outbound port — ACTIVE 사용자만 다룬다 */
export interface UsersRepository {
  findActiveById(userId: string): Promise<UserProfile | null>;
  updateNickname(
    userId: string,
    nickname: string,
  ): Promise<{ id: string; nickname: string | null }>;
}
