import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type {
  AuthAccount,
  AuthAccounts,
} from "@/auth/ports/auth-accounts.port";
import type { User } from "@/generated/prisma/client";

/** 소셜 계정 영속화 outbound adapter — unique 경합 등 영속성 세부사항을 흡수한다 */
@Injectable()
export class PrismaAuthAccountsAdapter implements AuthAccounts {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByKakaoId(
    kakaoUserId: string,
  ): Promise<{ account: AuthAccount; isNewUser: boolean }> {
    const existing = await this.findByKakaoId(kakaoUserId);
    if (existing) return { account: existing, isNewUser: false };

    try {
      const user = await this.prisma.user.create({
        data: {
          socialAccounts: {
            create: { provider: "KAKAO", providerUserId: kakaoUserId },
          },
        },
      });
      return { account: this.toAccount(user), isNewUser: true };
    } catch (error) {
      // 동시 가입 경합: unique(provider, providerUserId) 충돌이면 기존 계정으로 처리
      if (this.isUniqueViolation(error)) {
        const account = await this.findByKakaoId(kakaoUserId);
        if (account) return { account, isNewUser: false };
      }
      throw error;
    }
  }

  private async findByKakaoId(
    kakaoUserId: string,
  ): Promise<AuthAccount | null> {
    const socialAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: "KAKAO",
          providerUserId: kakaoUserId,
        },
      },
      include: { user: true },
    });
    return socialAccount ? this.toAccount(socialAccount.user) : null;
  }

  private toAccount(user: User): AuthAccount {
    return { userId: user.id, nickname: user.nickname, status: user.status };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    );
  }
}
