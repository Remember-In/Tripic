import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import { AuthService } from "@/auth/auth.service";
import type { KakaoVerifier } from "@/auth/ports/kakao-verifier.port";
import type {
  AuthAccount,
  AuthAccounts,
} from "@/auth/ports/auth-accounts.port";
import type {
  NewRefreshToken,
  RefreshTokens,
  StoredRefreshToken,
} from "@/auth/ports/refresh-tokens.port";
import type { Env } from "@/config/env";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const configStub = {
  get: (key: string) =>
    ({ JWT_ACCESS_TTL_SEC: 900, JWT_REFRESH_TTL_DAYS: 30 })[key],
} as unknown as ConfigService<Env, true>;

const jwtStub = {
  signAsync: vi.fn().mockResolvedValue("signed.jwt"),
} as unknown as JwtService;

/** port 계약대로 동작하는 in-memory fake (CLAUDE.md: mock 대신 fake) */
class FakeAuthAccounts implements AuthAccounts {
  accounts = new Map<string, AuthAccount>(); // kakaoUserId → account
  private seq = 0;

  async findOrCreateByKakaoId(kakaoUserId: string) {
    const existing = this.accounts.get(kakaoUserId);
    if (existing) return { account: existing, isNewUser: false };
    const account: AuthAccount = {
      userId: `user-${++this.seq}`,
      nickname: null,
      status: "ACTIVE",
    };
    this.accounts.set(kakaoUserId, account);
    return { account, isNewUser: true };
  }
}

class FakeRefreshTokens implements RefreshTokens {
  rows = new Map<
    string,
    StoredRefreshToken & { tokenHash: string; replaced: boolean }
  >();
  private seq = 0;
  userStatusOf: (userId: string) => "ACTIVE" | "DELETED" = () => "ACTIVE";

  async findByHash(tokenHash: string) {
    for (const row of this.rows.values()) {
      if (row.tokenHash === tokenHash) {
        return { ...row, userStatus: this.userStatusOf(row.userId) };
      }
    }
    return null;
  }

  async issue(token: NewRefreshToken) {
    const id = `rt-${++this.seq}`;
    this.rows.set(id, {
      id,
      ...token,
      revoked: false,
      replaced: false,
      userStatus: "ACTIVE",
    });
  }

  async rotate(currentId: string, replacement: NewRefreshToken) {
    const current = this.rows.get(currentId);
    if (!current || current.revoked) return false;
    current.revoked = true;
    current.replaced = true;
    await this.issue(replacement);
    return true;
  }

  async revokeFamily(familyId: string) {
    for (const row of this.rows.values()) {
      if (row.familyId === familyId) row.revoked = true;
    }
  }

  activeCount(familyId: string) {
    return [...this.rows.values()].filter(
      (r) => r.familyId === familyId && !r.revoked,
    ).length;
  }
}

const kakaoStub: KakaoVerifier = {
  verifyAccessToken: vi.fn().mockResolvedValue({ kakaoUserId: "999" }),
};

describe("AuthService", () => {
  let accounts: FakeAuthAccounts;
  let tokens: FakeRefreshTokens;
  let service: AuthService;

  beforeEach(() => {
    accounts = new FakeAuthAccounts();
    tokens = new FakeRefreshTokens();
    service = new AuthService(kakaoStub, accounts, tokens, jwtStub, configStub);
  });

  describe("loginWithKakao", () => {
    it("신규 카카오 계정이면 유저를 생성하고 isNewUser=true + refresh 토큰 발급", async () => {
      const result = await service.loginWithKakao("kakao-token");

      expect(result.isNewUser).toBe(true);
      expect(result.user.nickname).toBeNull();
      expect(result.accessToken).toBe("signed.jwt");
      expect(await tokens.findByHash(sha256(result.refreshToken))).toBeTruthy();
    });

    it("기존 계정이면 isNewUser=false", async () => {
      await service.loginWithKakao("kakao-token");
      const again = await service.loginWithKakao("kakao-token");
      expect(again.isNewUser).toBe(false);
    });

    it("탈퇴(soft delete) 계정이면 401", async () => {
      const { account } = await accounts.findOrCreateByKakaoId("999");
      account.status = "DELETED";
      await expect(
        service.loginWithKakao("kakao-token"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    it("정상 토큰이면 rotation — 새 토큰쌍 반환, 구 토큰은 무효화", async () => {
      const login = await service.loginWithKakao("kakao-token");

      const rotated = await service.refresh(login.refreshToken);

      expect(rotated.accessToken).toBe("signed.jwt");
      expect(rotated.refreshToken).not.toBe(login.refreshToken);
      const old = await tokens.findByHash(sha256(login.refreshToken));
      expect(old?.revoked).toBe(true);
    });

    it("미등록 토큰이면 401", async () => {
      await expect(service.refresh("nope")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("교체된 구 토큰 재사용(탈취 시나리오)이면 family 전체 무효화", async () => {
      const login = await service.loginWithKakao("kakao-token");
      const rotated = await service.refresh(login.refreshToken);

      // 구 토큰 재사용 → 401 + family revoke
      await expect(service.refresh(login.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      // 정상 발급받았던 새 토큰까지 무효화되어야 한다
      await expect(
        service.refresh(rotated.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("만료 토큰이면 401", async () => {
      const login = await service.loginWithKakao("kakao-token");
      const stored = await tokens.findByHash(sha256(login.refreshToken));
      tokens.rows.get(stored!.id)!.expiresAt = new Date(Date.now() - 1_000);

      await expect(service.refresh(login.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("탈퇴 계정의 토큰이면 401 (docs/10 §3 규칙)", async () => {
      const login = await service.loginWithKakao("kakao-token");
      tokens.userStatusOf = () => "DELETED";

      await expect(service.refresh(login.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("동시 refresh 경합으로 rotate가 실패하면 401 + family 전체 무효화 (탈취 의심)", async () => {
      const login = await service.loginWithKakao("kakao-token");
      const stored = await tokens.findByHash(sha256(login.refreshToken));
      tokens.rotate = async () => false;

      await expect(service.refresh(login.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      // 경합에서 먼저 성공한 쪽(공격자일 수 있음)의 신규 토큰까지 무효화되어야 한다
      expect(tokens.activeCount(stored!.familyId)).toBe(0);
    });
  });

  describe("logout", () => {
    it("본인 토큰이면 family 전체를 revoke 한다", async () => {
      const login = await service.loginWithKakao("kakao-token");
      const stored = await tokens.findByHash(sha256(login.refreshToken));

      await service.logout(stored!.userId, login.refreshToken);

      expect(tokens.activeCount(stored!.familyId)).toBe(0);
    });

    it("타인 토큰이면 아무것도 하지 않는다 (멱등)", async () => {
      const login = await service.loginWithKakao("kakao-token");
      const stored = await tokens.findByHash(sha256(login.refreshToken));

      await service.logout("someone-else", login.refreshToken);

      expect(tokens.activeCount(stored!.familyId)).toBe(1);
    });
  });
});
