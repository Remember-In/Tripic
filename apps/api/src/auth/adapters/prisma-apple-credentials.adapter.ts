import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { AppleCredentials } from "@/auth/ports/apple-credentials.port";

/** Apple 자격 증명 영속화 outbound adapter — apple_credentials 테이블 (docs/14 §5) */
@Injectable()
export class PrismaAppleCredentialsAdapter implements AppleCredentials {
  constructor(private readonly prisma: PrismaService) {}

  async saveForAppleUser(
    appleUserId: string,
    sealedRefreshToken: string,
  ): Promise<void> {
    await this.prisma.socialAccount.update({
      where: {
        provider_providerUserId: {
          provider: "APPLE",
          providerUserId: appleUserId,
        },
      },
      data: {
        appleCredential: {
          upsert: {
            create: { refreshToken: sealedRefreshToken },
            update: { refreshToken: sealedRefreshToken },
          },
        },
      },
    });
  }

  async findSealedByUserId(userId: string): Promise<string | null> {
    const credential = await this.prisma.appleCredential.findFirst({
      where: { socialAccount: { userId, provider: "APPLE" } },
    });
    return credential?.refreshToken ?? null;
  }

  async deleteForAppleUser(appleUserId: string): Promise<void> {
    await this.prisma.appleCredential.deleteMany({
      where: {
        socialAccount: { provider: "APPLE", providerUserId: appleUserId },
      },
    });
  }
}
