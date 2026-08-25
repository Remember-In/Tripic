import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from "@/users/ports/users-repository.port";

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  async getMe(userId: string) {
    const user = await this.users.findActiveById(userId);
    if (!user) {
      throw new UnauthorizedException("account not found or deleted");
    }
    return user;
  }

  /** 온보딩의 닉네임 설정 단계 (Figma Flow: 신규가입 → 닉네임/권한 설정) */
  async updateNickname(userId: string, nickname: string) {
    await this.getMe(userId);
    return this.users.updateNickname(userId, nickname);
  }
}
