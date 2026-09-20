import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type {
  UserProfile,
  UsersRepository,
} from "@/users/ports/users-repository.port";

@Injectable()
export class PrismaUsersAdapter implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { socialAccounts: { select: { provider: true }, take: 1 } },
    });
    // 사용자는 항상 소셜 계정과 함께 생성된다 — 없으면 유효한 계정이 아니다
    const provider = user?.socialAccounts[0]?.provider;
    if (!user || !provider) return null;
    return {
      id: user.id,
      nickname: user.nickname,
      provider,
      createdAt: user.createdAt,
    };
  }

  async updateNickname(
    userId: string,
    nickname: string,
  ): Promise<{ id: string; nickname: string | null }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { nickname },
    });
    return { id: user.id, nickname: user.nickname };
  }

  async deleteById(userId: string): Promise<void> {
    // delete 는 없는 행에 P2025 를 던지므로 멱등한 deleteMany 를 쓴다.
    // 소셜 계정·refresh 토큰·기록은 스키마의 onDelete: Cascade 로 함께 사라진다.
    await this.prisma.user.deleteMany({ where: { id: userId } });
  }
}
