import { beforeEach, describe, expect, it } from "vitest";
import { BadGatewayException, UnauthorizedException } from "@nestjs/common";
import type { AuthProvider } from "@tripic/shared";
import { UsersService } from "@/users/users.service";
import type { SocialAccountUnlinker } from "@/users/ports/social-account-unlinker.port";
import type {
  UserProfile,
  UsersRepository,
} from "@/users/ports/users-repository.port";

/** port 계약대로 동작하는 in-memory fake (CLAUDE.md: mock 대신 fake) */
class FakeUsers implements UsersRepository {
  rows = new Map<string, UserProfile>();

  seed(
    userId: string,
    nickname: string | null = null,
    provider: AuthProvider = "KAKAO",
  ): string {
    this.rows.set(userId, {
      id: userId,
      nickname,
      provider,
      createdAt: new Date(),
    });
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

/** 외부 로그인 연결 해제 fake — 호출 시점에 사용자가 아직 남아 있었는지 기록한다 */
class FakeUnlinker implements SocialAccountUnlinker {
  calls: { userId: string; userExisted: boolean }[] = [];
  failure: Error | null = null;

  constructor(private readonly users: FakeUsers) {}

  async unlink(userId: string): Promise<void> {
    this.calls.push({ userId, userExisted: this.users.rows.has(userId) });
    if (this.failure) throw this.failure;
  }
}

describe("UsersService", () => {
  let users: FakeUsers;
  let unlinker: FakeUnlinker;
  let service: UsersService;

  beforeEach(() => {
    users = new FakeUsers();
    unlinker = new FakeUnlinker(users);
    service = new UsersService(users, unlinker);
  });

  describe("getMe", () => {
    it("존재하는 사용자면 프로필을 돌려준다", async () => {
      users.seed("user-1", "제이");

      await expect(service.getMe("user-1")).resolves.toMatchObject({
        id: "user-1",
        nickname: "제이",
      });
    });

    it("가입에 쓴 로그인 수단(provider)을 함께 돌려준다", async () => {
      users.seed("apple-user", null, "APPLE");

      await expect(service.getMe("apple-user")).resolves.toMatchObject({
        provider: "APPLE",
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
      expect(unlinker.calls).toHaveLength(0);
    });

    it("삭제하기 전에 외부 로그인 연결을 먼저 해제한다 (Apple revoke — docs/14 §6)", async () => {
      users.seed("user-1", null, "APPLE");

      await service.withdraw("user-1");

      expect(unlinker.calls).toEqual([{ userId: "user-1", userExisted: true }]);
      expect(users.rows.has("user-1")).toBe(false);
    });

    it("연결 해제가 실패하면 사용자를 삭제하지 않고 오류를 그대로 돌려준다 (502)", async () => {
      users.seed("user-1", null, "APPLE");
      unlinker.failure = new BadGatewayException("apple revoke error");

      await expect(service.withdraw("user-1")).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(users.rows.has("user-1")).toBe(true);
    });
  });
});
