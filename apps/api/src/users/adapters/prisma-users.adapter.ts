import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type {
  UserProfile,
  UsersRepository,
} from "@/users/ports/users-repository.port";

@Injectable()
export class PrismaUsersAdapter implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveById(userId: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE") return null;
    return { id: user.id, nickname: user.nickname, createdAt: user.createdAt };
  }

  async updateNickname(userId: string, nickname: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { nickname },
    });
    return { id: user.id, nickname: user.nickname };
  }
}
