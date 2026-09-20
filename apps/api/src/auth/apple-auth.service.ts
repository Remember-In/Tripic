import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AppleLoginInput, SocialLoginResult } from "@tripic/shared";
import {
  APPLE_AUTH_CLIENT,
  type AppleAuthClient,
} from "@/auth/ports/apple-auth-client.port";
import {
  APPLE_CREDENTIALS,
  type AppleCredentials,
} from "@/auth/ports/apple-credentials.port";
import {
  APPLE_IDENTITY_VERIFIER,
  type AppleIdentityVerifier,
} from "@/auth/ports/apple-identity-verifier.port";
import {
  AUTH_ACCOUNTS,
  type AuthAccounts,
  type SocialIdentity,
} from "@/auth/ports/auth-accounts.port";
import {
  PROVIDER_TOKEN_CIPHER,
  type ProviderTokenCipher,
} from "@/auth/ports/provider-token-cipher.port";
import {
  REFRESH_TOKENS,
  type RefreshTokens,
} from "@/auth/ports/refresh-tokens.port";
import {
  SESSION_ISSUER,
  type SessionIssuer,
} from "@/auth/ports/session-issuer.port";
import type { SocialAccountUnlinker } from "@/users/ports/social-account-unlinker.port";

const appleIdentity = (appleUserId: string): SocialIdentity => ({
  provider: "APPLE",
  providerUserId: appleUserId,
});

/** Sign in with Apple 유스케이스 — 로그인, 서버 알림, 탈퇴 전 토큰 revoke (docs/14) */
@Injectable()
export class AppleAuthService implements SocialAccountUnlinker {
  constructor(
    @Inject(APPLE_IDENTITY_VERIFIER)
    private readonly verifier: AppleIdentityVerifier,
    @Inject(APPLE_AUTH_CLIENT) private readonly appleApi: AppleAuthClient,
    @Inject(APPLE_CREDENTIALS) private readonly credentials: AppleCredentials,
    @Inject(PROVIDER_TOKEN_CIPHER) private readonly cipher: ProviderTokenCipher,
    @Inject(AUTH_ACCOUNTS) private readonly accounts: AuthAccounts,
    @Inject(REFRESH_TOKENS) private readonly tokens: RefreshTokens,
    @Inject(SESSION_ISSUER) private readonly sessions: SessionIssuer,
  ) {}

  /** POST /auth/apple — identity token 검증 + code 교환 후 로그인(없으면 가입) (docs/14 §3) */
  async loginWithApple(input: AppleLoginInput): Promise<SocialLoginResult> {
    const { appleUserId } = await this.verifier.verifyIdentityToken(
      input.identityToken,
    );
    const exchanged = await this.appleApi.exchangeAuthorizationCode(
      input.authorizationCode,
    );
    // 다른 사용자의 authorization code 를 끼워 넣은 요청 차단
    if (exchanged.appleUserId !== appleUserId) {
      throw new UnauthorizedException(
        "apple authorization code belongs to another user",
      );
    }

    const { account, isNewUser } = await this.accounts.findOrCreateBySocial(
      appleIdentity(appleUserId),
    );
    // 재로그인마다 최신 refresh token 으로 교체 — 탈퇴 시 revoke 에 쓴다 (docs/14 §5)
    await this.credentials.saveForAppleUser(
      appleUserId,
      this.cipher.encrypt(exchanged.refreshToken),
    );
    return this.sessions.startSession(account, isNewUser);
  }

  /** POST /auth/apple/notifications — 모든 처리는 멱등이다 (docs/14 §4) */
  async handleNotification(payload: string): Promise<void> {
    const event = await this.verifier.verifyNotification(payload);
    const identity = appleIdentity(event.appleUserId);

    switch (event.type) {
      case "consent-revoked": {
        // 연결 해제: 세션만 끊고 계정·기록은 유지한다. Apple 토큰은 이미 무효다
        const userId = await this.accounts.findUserIdBySocial(identity);
        if (userId) await this.tokens.revokeAllForUser(userId);
        await this.credentials.deleteForAppleUser(event.appleUserId);
        return;
      }
      case "account-delete":
      case "account-deleted": {
        // Apple 계정 영구 삭제: 회원탈퇴와 같은 hard delete. revoke 대상 토큰이 이미 없다
        const userId = await this.accounts.findUserIdBySocial(identity);
        if (userId) await this.accounts.deleteUser(userId);
        return;
      }
      default:
        // email-enabled / email-disabled — 이메일을 저장하지 않는다. 모르는 type 도 무시
        return;
    }
  }

  /** 회원탈퇴 직전 Apple 토큰 revoke. 실패하면 예외가 전파돼 탈퇴가 중단된다 (docs/14 §6) */
  async unlink(userId: string): Promise<void> {
    const sealed = await this.credentials.findSealedByUserId(userId);
    if (!sealed) return;
    await this.appleApi.revokeRefreshToken(this.cipher.decrypt(sealed));
  }
}
