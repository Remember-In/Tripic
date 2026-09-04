import { beforeEach, describe, expect, it } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import { UsersService } from "@/users/users.service";
import type {
  UserProfile,
  UsersRepository,
} from "@/users/ports/users-repository.port";

/** port 계약대로 동작하는 in-memory fake (CLAUDE.md: mock 대신 fake) */
class FakeUsers implements UsersRepository {
  rows = new Map<string, UserProfile>();

  seed(userId: string, nickname: string | null = null): string {
    this.rows.set(userId, { id: userId, nickname, createdAt: new Date() });
    return userId;
  }

  async findById(userId: string): Promise<UserProfile | null> {
    return this.rows.get(userId) ?? null;
  }

  async updateNickname(
    userId: string,
    nickname: string,
  ): Promise<{ id: string; nickname: string | null }> {
    const user = this.rows.get(userId);
    if (!user) throw new Error("fake: 없는 사용자 갱신");
    user.nickname = nickname;
    return { id: user.id, nickname };
  }

  async deleteById(userId: string): Promise<void> {
    this.rows.delete(userId);
  }
}

describe("UsersService", () => {
  let users: FakeUsers;
  let service: UsersService;

  beforeEach(() => {
    users = new FakeUsers();
    service = new UsersService(users);
  });

  describe("getMe", () => {
    it("존재하는 사용자면 프로필을 돌려준다", async () => {
      users.seed("user-1", "제이");

      await expect(service.getMe("user-1")).resolves.toMatchObject({
        id: "user-1",
        nickname: "제이",
      });
    });

    it("없는 사용자면 401 — 탈퇴 후 남은 access token 을 막는다", async () => {
      await expect(service.getMe("gone")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe("updateNickname", () => {
    it("닉네임을 바꾼다", async () => {
      users.seed("user-1");

      await expect(service.updateNickname("user-1", "제이")).resolves.toEqual({
        id: "user-1",
        nickname: "제이",
      });
    });

    it("없는 사용자면 401", async () => {
      await expect(
        service.updateNickname("gone", "제이"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("withdraw", () => {
    it("사용자 행을 즉시 삭제한다 (hard delete — docs/10 §3)", async () => {
      users.seed("user-1");

      await service.withdraw("user-1");

      expect(users.rows.has("user-1")).toBe(false);
    });

    it("없는 사용자면 401 — 이미 탈퇴한 토큰으로 다시 호출한 경우", async () => {
      await expect(service.withdraw("gone")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
