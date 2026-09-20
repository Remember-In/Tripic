import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import { AuthService } from "@/auth/auth.service";
import type { KakaoVerifier } from "@/auth/ports/kakao-verifier.port";
import type {
  KakaoAuthClient,
  KakaoCodeExchange,
} from "@/auth/ports/kakao-auth-client.port";
import type {
  AuthAccount,
  AuthAccounts,
  SocialIdentity,
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

const socialKey = (identity: SocialIdentity) =>
  `${identity.provider}:${identity.providerUserId}`;

/** port 계약대로 동작하는 in-memory fake (CLAUDE.md: mock 대신 fake) */
class FakeAuthAccounts implements AuthAccounts {
  accounts = new Map<string, AuthAccount>(); // "PROVIDER:providerUserId" → account
  private seq = 0;

  async findOrCreateBySocial(identity: SocialIdentity) {
    const existing = this.accounts.get(socialKey(identity));
    if (existing) return { account: existing, isNewUser: false };
    const account: AuthAccount = {
      userId: `user-${++this.seq}`,
      nickname: null,
    };
    this.accounts.set(socialKey(identity), account);
    return { account, isNewUser: true };
  }

  async findUserIdBySocial(identity: SocialIdentity) {
    return this.accounts.get(socialKey(identity))?.userId ?? null;
  }

  async deleteUser(userId: string) {
    for (const [key, account] of this.accounts) {
      if (account.userId === userId) this.accounts.delete(key);
    }
  }
}

class FakeRefreshTokens implements RefreshTokens {
  rows = new Map<
    string,
    StoredRefreshToken & { tokenHash: string; replaced: boolean }
  >();
  private seq = 0;

  async findByHash(tokenHash: string) {
    for (const row of this.rows.values()) {
      if (row.tokenHash === tokenHash) return { ...row };
    }
    return null;
  }

  async issue(token: NewRefreshToken) {
    const id = `rt-${++this.seq}`;
    this.rows.set(id, { id, ...token, revoked: false, replaced: false });
  }

  /** 탈퇴 = users 행 삭제 → refresh_tokens 도 cascade 로 사라진다 */
  deleteUserRows(userId: string) {
    for (const [id, row] of this.rows) {
      if (row.userId === userId) this.rows.delete(id);
    }
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

  async revokeAllForUser(userId: string) {
    for (const row of this.rows.values()) {
      if (row.userId === userId) row.revoked = true;
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

/** code → 교환된 access token. 등록되지 않은 code 는 카카오가 거부한 것으로 본다 */
class FakeKakaoAuthClient implements KakaoAuthClient {
  codes = new Map<string, string>([["web-code", "kakao-token"]]);
  exchanged: KakaoCodeExchange[] = [];

  async exchangeAuthorizationCode(input: KakaoCodeExchange) {
    this.exchanged.push(input);
    const kakaoAccessToken = this.codes.get(input.code);
    if (!kakaoAccessToken) {
      throw new UnauthorizedException("invalid kakao authorization code");
    }
    return { kakaoAccessToken };
  }
}

describe("AuthService", () => {
  let accounts: FakeAuthAccounts;
  let tokens: FakeRefreshTokens;
  let kakaoAuth: FakeKakaoAuthClient;
  let service: AuthService;

  beforeEach(() => {
    accounts = new FakeAuthAccounts();
    tokens = new FakeRefreshTokens();
    kakaoAuth = new FakeKakaoAuthClient();
    service = new AuthService(
      kakaoStub,
      kakaoAuth,
      accounts,
      tokens,
      jwtStub,
      configStub,
    );
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

    it("탈퇴한 카카오 계정으로 다시 로그인하면 신규 가입으로 처리된다", async () => {
      const first = await service.loginWithKakao("kakao-token");
      // 탈퇴 = 계정 행 삭제 (hard delete)
      accounts.accounts.delete("KAKAO:999");

      const again = await service.loginWithKakao("kakao-token");

      expect(again.isNewUser).toBe(true);
      expect(again.user.id).not.toBe(first.user.id);
    });

    it("카카오 user id 는 KAKAO provider 계정으로 찾는다 — 같은 id 의 Apple 계정과 섞이지 않는다", async () => {
      const apple = await accounts.findOrCreateBySocial({
        provider: "APPLE",
        providerUserId: "999",
      });

      const kakao = await service.loginWithKakao("kakao-token");

      expect(kakao.isNewUser).toBe(true);
      expect(kakao.user.id).not.toBe(apple.account.userId);
    });
  });

  /** 웹은 access token 을 만들 수 없어 code 를 보낸다 — 서버가 교환한다 (docs/15 §2) */
  describe("loginWithKakaoWebCode", () => {
    const input = {
      code: "web-code",
      redirectUri: "https://tripic.example/auth/kakao/callback",
    };

    it("신규 카카오 계정이면 유저를 생성하고 isNewUser=true + refresh 토큰 발급", async () => {
      const result = await service.loginWithKakaoWebCode(input);

      expect(result.isNewUser).toBe(true);
      expect(result.user.nickname).toBeNull();
      expect(result.accessToken).toBe("signed.jwt");
      expect(await tokens.findByHash(sha256(result.refreshToken))).toBeTruthy();
    });

    it("code 와 redirectUri 를 그대로 교환 port 에 넘긴다", async () => {
      await service.loginWithKakaoWebCode(input);

      expect(kakaoAuth.exchanged).toEqual([input]);
    });

    it("같은 카카오 계정이면 네이티브 로그인과 같은 사용자다 — 경로가 갈라지지 않는다", async () => {
      const native = await service.loginWithKakao("kakao-token");

      const web = await service.loginWithKakaoWebCode(input);

      expect(web.isNewUser).toBe(false);
      expect(web.user.id).toBe(native.user.id);
    });

    it("교환에 실패하면 401 을 그대로 전파하고 계정을 만들지 않는다", async () => {
      await expect(
        service.loginWithKakaoWebCode({ ...input, code: "expired-code" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(accounts.accounts.size).toBe(0);
    });

    it("로그인마다 새 rotation family 를 시작한다", async () => {
      const first = await service.loginWithKakaoWebCode(input);
      const second = await service.loginWithKakaoWebCode(input);

      const firstRow = await tokens.findByHash(sha256(first.refreshToken));
      const secondRow = await tokens.findByHash(sha256(second.refreshToken));

      expect(firstRow?.familyId).toBeDefined();
      expect(firstRow?.familyId).not.toBe(secondRow?.familyId);
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

    it("탈퇴로 토큰 행이 사라졌으면 401 (docs/10 §3 — cascade 파기)", async () => {
      const login = await service.loginWithKakao("kakao-token");
      const stored = await tokens.findByHash(sha256(login.refreshToken));
      tokens.deleteUserRows(stored!.userId);

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
