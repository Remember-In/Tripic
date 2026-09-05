import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type {
  NewRefreshToken,
  RefreshTokens,
  StoredRefreshToken,
} from "@/auth/ports/refresh-tokens.port";

class RotationConflict extends Error {}

/** refresh 토큰 영속화 outbound adapter — rotation 원자성을 트랜잭션으로 보장한다 */
@Injectable()
export class PrismaRefreshTokensAdapter implements RefreshTokens {
  constructor(private readonly prisma: PrismaService) {}

  async findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    // 탈퇴하면 이 행 자체가 cascade 로 사라지므로 사용자 상태를 함께 조회할 필요가 없다
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!row) return null;
    return {
      id: row.id,
      familyId: row.familyId,
      userId: row.userId,
      revoked: row.revokedAt !== null || row.replacedById !== null,
      expiresAt: row.expiresAt,
    };
  }

  async issue(token: NewRefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({ data: token });
  }

  async rotate(
    currentId: string,
    replacement: NewRefreshToken,
  ): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.refreshToken.create({ data: replacement });
        // 조건부 update — 동시 refresh 경합 시 한쪽만 성공한다
        const rotated = await tx.refreshToken.updateMany({
          where: { id: currentId, revokedAt: null, replacedById: null },
          data: { revokedAt: new Date(), replacedById: created.id },
        });
        if (rotated.count === 0) throw new RotationConflict();
      });
      return true;
    } catch (error) {
      if (error instanceof RotationConflict) return false;
      throw error;
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
