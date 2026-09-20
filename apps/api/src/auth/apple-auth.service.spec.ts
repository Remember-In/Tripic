import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { BadGatewayException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AppleAuthService } from "@/auth/apple-auth.service";
import { AuthService } from "@/auth/auth.service";
import type { AppleAuthClient } from "@/auth/ports/apple-auth-client.port";
import type { AppleCredentials } from "@/auth/ports/apple-credentials.port";
import type {
  AppleIdentityVerifier,
  AppleNotificationEvent,
} from "@/auth/ports/apple-identity-verifier.port";
import type {
  AuthAccount,
  AuthAccounts,
  SocialIdentity,
} from "@/auth/ports/auth-accounts.port";
import type { KakaoVerifier } from "@/auth/ports/kakao-verifier.port";
import type { ProviderTokenCipher } from "@/auth/ports/provider-token-cipher.port";
import type {
  NewRefreshToken,
  RefreshTokens,
  StoredRefreshToken,
} from "@/auth/ports/refresh-tokens.port";
import type { Env } from "@/config/env";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const socialKey = (identity: SocialIdentity) =>
  `${identity.provider}:${identity.providerUserId}`;

/** port 계약대로 동작하는 in-memory fake (CLAUDE.md: mock 대신 fake) */
class FakeAuthAccounts implements AuthAccounts {
  accounts = new Map<string, AuthAccount>();
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
  rows = new Map<string, StoredRefreshToken & { tokenHash: string }>();
  private seq = 0;

  async findByHash(tokenHash: string) {
    for (const row of this.rows.values()) {
      if (row.tokenHash === tokenHash) return { ...row };
    }
    return null;
  }

  async issue(token: NewRefreshToken) {
    const id = `rt-${++this.seq}`;
    this.rows.set(id, { id, ...token, revoked: false });
  }

  async rotate() {
    return false;
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
}

/** Apple 자격 증명 fake — appleUserId → 암호문. 사용자 삭제 cascade 는 accounts 로 판단한다 */
class FakeAppleCredentials implements AppleCredentials {
  sealed = new Map<string, string>();

  constructor(private readonly accounts: FakeAuthAccounts) {}

  async saveForAppleUser(appleUserId: string, sealedRefreshToken: string) {
    this.sealed.set(appleUserId, sealedRefreshToken);
  }

  async findSealedByUserId(userId: string) {
    for (const [appleUserId, sealed] of this.sealed) {
      const owner = await this.accounts.findUserIdBySocial({
        provider: "APPLE",
        providerUserId: appleUserId,
      });
      if (owner === userId) return sealed;
    }
    return null;
  }

  async deleteForAppleUser(appleUserId: string) {
    this.sealed.delete(appleUserId);
  }
}

/** 암호화 fake — 평문과 구분되는 형태로 감싸기만 한다 */
const cipher: ProviderTokenCipher = {
  encrypt: (plaintext) => `sealed(${plaintext})`,
  decrypt: (sealed) => sealed.replace(/^sealed\((.*)\)$/, "$1"),
};

/** "id:<sub>" 토큰만 통과시키는 verifier fake. 알림은 "<type>:<sub>" 형태 */
const verifier: AppleIdentityVerifier = {
  async verifyIdentityToken(identityToken) {
    if (!identityToken.startsWith("id:")) {
      throw new UnauthorizedException("invalid apple identity token");
    }
    return { appleUserId: identityToken.slice("id:".length) };
  },
  async verifyNotification(payload): Promise<AppleNotificationEvent> {
    const [type = "", appleUserId = ""] = payload.split(":");
    return { type, appleUserId };
  },
};

class FakeAppleApi implements AppleAuthClient {
  revoked: string[] = [];
  revokeFailure: Error | null = null;

  /** "code:<sub>" 는 해당 sub 의 refresh token 으로 교환된다 */
  async exchangeAuthorizationCode(authorizationCode: string) {
    if (!authorizationCode.startsWith("code:")) {
      throw new UnauthorizedException("invalid apple authorization code");
    }
    const appleUserId = authorizationCode.slice("code:".length);
    return { refreshToken: `apple-rt-${appleUserId}`, appleUserId };
  }

  async revokeRefreshToken(refreshToken: string) {
    if (this.revokeFailure) throw this.revokeFailure;
    this.revoked.push(refreshToken);
  }
}

const unusedKakao: KakaoVerifier = {
  async verifyAccessToken() {
    throw new Error("카카오는 이 테스트에서 쓰지 않는다");
  },
};

describe("AppleAuthService", () => {
  let accounts: FakeAuthAccounts;
  let tokens: FakeRefreshTokens;
  let credentials: FakeAppleCredentials;
  let appleApi: FakeAppleApi;
  let service: AppleAuthService;

  beforeEach(() => {
    accounts = new FakeAuthAccounts();
    tokens = new FakeRefreshTokens();
    credentials = new FakeAppleCredentials(accounts);
    appleApi = new FakeAppleApi();
    const auth = new AuthService(
      unusedKakao,
      accounts,
      tokens,
      new JwtService({ secret: "unit-test-secret-0123456789abcdef" }),
      new ConfigService<Env, true>({
        JWT_ACCESS_TTL_SEC: 900,
        JWT_REFRESH_TTL_DAYS: 30,
      }),
    );
    service = new AppleAuthService(
      verifier,
      appleApi,
      credentials,
      cipher,
      accounts,
      tokens,
      auth,
    );
  });

  const loginAs = (sub: string) =>
    service.loginWithApple({
      identityToken: `id:${sub}`,
      authorizationCode: `code:${sub}`,
    });

  describe("loginWithApple", () => {
    it("신규 Apple 계정이면 가입하고 세션을 발급한다", async () => {
      const result = await loginAs("apple-1");

      expect(result.isNewUser).toBe(true);
      expect(result.user.nickname).toBeNull();
      expect(await tokens.findByHash(sha256(result.refreshToken))).toBeTruthy();
    });

    it("같은 Apple 계정으로 다시 로그인하면 같은 사용자다", async () => {
      const first = await loginAs("apple-1");
      const second = await loginAs("apple-1");

      expect(second.isNewUser).toBe(false);
      expect(second.user.id).toBe(first.user.id);
    });

    it("Apple refresh token 은 암호화해서 저장한다 — 평문을 저장하지 않는다", async () => {
      await loginAs("apple-1");

      expect(credentials.sealed.get("apple-1")).toBe(
        "sealed(apple-rt-apple-1)",
      );
    });

    it("다른 사용자의 authorization code 를 끼워 넣으면 401 이고 계정을 만들지 않는다", async () => {
      await expect(
        service.loginWithApple({
          identityToken: "id:victim",
          authorizationCode: "code:attacker",
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(accounts.accounts.size).toBe(0);
      expect(credentials.sealed.size).toBe(0);
    });

    it("identity token 검증에 실패하면 code 를 교환하지 않고 401", async () => {
      await expect(
        service.loginWithApple({
          identityToken: "forged",
          authorizationCode: "code:apple-1",
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(accounts.accounts.size).toBe(0);
    });

    it("같은 id 의 카카오 계정과는 별개의 사용자다 (계정 연결 미지원)", async () => {
      const kakao = await accounts.findOrCreateBySocial({
        provider: "KAKAO",
        providerUserId: "shared-id",
      });

      const apple = await loginAs("shared-id");

      expect(apple.isNewUser).toBe(true);
      expect(apple.user.id).not.toBe(kakao.account.userId);
    });
  });

  describe("handleNotification", () => {
    it("consent-revoked — 세션을 전부 끊고 Apple 자격 증명을 지우지만 계정은 유지한다", async () => {
      const session = await loginAs("apple-1");

      await service.handleNotification("consent-revoked:apple-1");

      const stored = await tokens.findByHash(sha256(session.refreshToken));
      expect(stored?.revoked).toBe(true);
      expect(credentials.sealed.has("apple-1")).toBe(false);
      expect(
        await accounts.findUserIdBySocial({
          provider: "APPLE",
          providerUserId: "apple-1",
        }),
      ).toBe(session.user.id);
    });

    it("account-delete — 사용자를 삭제하고 Apple revoke 는 호출하지 않는다", async () => {
      await loginAs("apple-1");

      await service.handleNotification("account-delete:apple-1");

      expect(accounts.accounts.size).toBe(0);
      expect(appleApi.revoked).toHaveLength(0);
    });

    it("account-deleted 표기도 같은 삭제로 처리한다", async () => {
      await loginAs("apple-1");

      await service.handleNotification("account-deleted:apple-1");

      expect(accounts.accounts.size).toBe(0);
    });

    it("email-disabled 같은 이메일 이벤트는 아무것도 바꾸지 않는다", async () => {
      const session = await loginAs("apple-1");

      await service.handleNotification("email-disabled:apple-1");

      const stored = await tokens.findByHash(sha256(session.refreshToken));
      expect(stored?.revoked).toBe(false);
      expect(credentials.sealed.has("apple-1")).toBe(true);
      expect(accounts.accounts.size).toBe(1);
    });

    it("모르는 사용자에 대한 알림은 조용히 넘어간다 (멱등)", async () => {
      await expect(
        service.handleNotification("account-delete:nobody"),
      ).resolves.toBeUndefined();
      await expect(
        service.handleNotification("consent-revoked:nobody"),
      ).resolves.toBeUndefined();
    });
  });

  describe("unlink (회원탈퇴 직전)", () => {
    it("저장된 Apple refresh token 을 복호화해 revoke 한다", async () => {
      const session = await loginAs("apple-1");

      await service.unlink(session.user.id);

      expect(appleApi.revoked).toEqual(["apple-rt-apple-1"]);
    });

    it("Apple 자격 증명이 없는 사용자(카카오 가입자·연결 해제 후)는 revoke 하지 않는다", async () => {
      const kakao = await accounts.findOrCreateBySocial({
        provider: "KAKAO",
        providerUserId: "k-1",
      });

      await service.unlink(kakao.account.userId);

      expect(appleApi.revoked).toHaveLength(0);
    });

    it("Apple revoke 가 실패하면 오류를 그대로 전파한다 — 탈퇴를 중단시키기 위해서다", async () => {
      const session = await loginAs("apple-1");
      appleApi.revokeFailure = new BadGatewayException("apple revoke error");

      await expect(service.unlink(session.user.id)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });
});
