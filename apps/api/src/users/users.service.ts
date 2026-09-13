import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import {
  SOCIAL_ACCOUNT_UNLINKER,
  type SocialAccountUnlinker,
} from "@/users/ports/social-account-unlinker.port";
import {
  USERS_REPOSITORY,
  type UserProfile,
  type UsersRepository,
} from "@/users/ports/users-repository.port";

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SOCIAL_ACCOUNT_UNLINKER)
    private readonly unlinker: SocialAccountUnlinker,
  ) {}

  async getMe(userId: string): Promise<UserProfile> {
    const user = await this.users.findById(userId);
    if (!user) {
      // 탈퇴 후 TTL 이 남은 access token 은 여기서 막힌다 (docs/10 §3)
      throw new UnauthorizedException("account not found");
    }
    return user;
  }

  /** 온보딩의 닉네임 설정 단계 (Figma Flow: 신규가입 → 닉네임/권한 설정) */
  async updateNickname(
    userId: string,
    nickname: string,
  ): Promise<{ id: string; nickname: string | null }> {
    await this.getMe(userId);
    return this.users.updateNickname(userId, nickname);
  }

  /**
   * 회원탈퇴 — users 행을 지체 없이 물리 삭제한다 (docs/10 §3·§6).
   * 소셜 계정·refresh 토큰·기록은 FK cascade 로 함께 파기되고 복구는 지원하지 않는다.
   * 외부 로그인 연결 해제(Apple revoke)를 먼저 하고, 실패하면 삭제하지 않는다 (docs/14 §6).
   */
  async withdraw(userId: string): Promise<void> {
    await this.getMe(userId);
    await this.unlinker.unlink(userId);
    await this.users.deleteById(userId);
  }
}
