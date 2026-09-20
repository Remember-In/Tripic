import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { AuthTokens, SocialLoginResult } from "@tripic/shared";
import {
  KAKAO_VERIFIER,
  type KakaoVerifier,
} from "@/auth/ports/kakao-verifier.port";
import {
  AUTH_ACCOUNTS,
  type AuthAccount,
  type AuthAccounts,
} from "@/auth/ports/auth-accounts.port";
import {
  REFRESH_TOKENS,
  type RefreshTokens,
  type StoredRefreshToken,
} from "@/auth/ports/refresh-tokens.port";
import type { SessionIssuer } from "@/auth/ports/session-issuer.port";
import type { Env } from "@/config/env";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** 카카오 로그인·세션 토큰 유스케이스 (docs/10-auth-db-design.md §2–3) — I/O는 port 뒤로 */
@Injectable()
export class AuthService implements SessionIssuer {
  private readonly accessTtlSec: number;
  private readonly refreshTtlDays: number;

  constructor(
    @Inject(KAKAO_VERIFIER) private readonly kakao: KakaoVerifier,
    @Inject(AUTH_ACCOUNTS) private readonly accounts: AuthAccounts,
    @Inject(REFRESH_TOKENS) private readonly tokens: RefreshTokens,
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessTtlSec = config.get("JWT_ACCESS_TTL_SEC", { infer: true });
    this.refreshTtlDays = config.get("JWT_REFRESH_TTL_DAYS", { infer: true });
  }

  /** POST /auth/kakao — 카카오 토큰 검증 후 로그인(없으면 가입) */
  async loginWithKakao(kakaoAccessToken: string): Promise<SocialLoginResult> {
    const { kakaoUserId } =
      await this.kakao.verifyAccessToken(kakaoAccessToken);

    // 탈퇴는 hard delete 라 소셜 계정 행도 함께 사라진다 — 같은 카카오 계정으로
    // 다시 로그인하면 신규 가입으로 처리된다 (docs/10 §3)
    const { account, isNewUser } = await this.accounts.findOrCreateBySocial({
      provider: "KAKAO",
      providerUserId: kakaoUserId,
    });
    return this.startSession(account, isNewUser);
  }

  /** 소셜 계정 확인이 끝난 사용자에게 세션을 발급한다 — 카카오·Apple 로그인 공통 */
  async startSession(
    account: AuthAccount,
    isNewUser: boolean,
  ): Promise<SocialLoginResult> {
    // 로그인마다 새 rotation family 시작
    const tokens = await this.issueTokens(account.userId, randomUUID());
    return {
      ...tokens,
      isNewUser,
      user: { id: account.userId, nickname: account.nickname },
    };
  }

  /** POST /auth/refresh — rotation + 재사용(탈취) 감지 (docs/10 §3) */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.tokens.findByHash(sha256(refreshToken));
    if (!stored) throw new UnauthorizedException("unknown refresh token");
    await this.assertUsable(stored);

    const raw = this.newOpaqueToken();
    const rotated = await this.tokens.rotate(stored.id, {
      tokenHash: sha256(raw),
      familyId: stored.familyId,
      userId: stored.userId,
      expiresAt: this.refreshExpiry(),
    });
    if (!rotated) {
      // 경합에서 다른 요청이 같은 토큰을 먼저 사용함 — 정상 클라이언트는 같은 토큰을
      // 동시에 두 번 쓰지 않으므로 탈취 의심으로 간주하고 family 전체를 무효화한다
      await this.tokens.revokeFamily(stored.familyId);
      throw new UnauthorizedException("refresh token reuse detected");
    }

    return {
      accessToken: await this.signAccessToken(stored.userId),
      refreshToken: raw,
      expiresIn: this.accessTtlSec,
    };
  }

  /** POST /auth/logout — 제시한 refresh token 의 family 전체 revoke (멱등) */
  async logout(userId: string, refreshToken: string): Promise<void> {
    const stored = await this.tokens.findByHash(sha256(refreshToken));
    if (!stored || stored.userId !== userId) return;
    await this.tokens.revokeFamily(stored.familyId);
  }

  /**
   * 재사용 감지·만료 검사 — 위반 시 401.
   * 탈퇴 계정은 별도 검사가 필요 없다: 토큰 행이 cascade 로 사라져 findByHash 에서 이미 걸린다.
   */
  private async assertUsable(stored: StoredRefreshToken): Promise<void> {
    if (stored.revoked) {
      // 이미 교체/폐기된 토큰의 재사용 → 탈취 간주, family 전체 즉시 revoke
      await this.tokens.revokeFamily(stored.familyId);
      throw new UnauthorizedException("refresh token reuse detected");
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException("refresh token expired");
    }
  }

  private async issueTokens(
    userId: string,
    familyId: string,
  ): Promise<AuthTokens> {
    const raw = this.newOpaqueToken();
    await this.tokens.issue({
      tokenHash: sha256(raw),
      familyId,
      userId,
      expiresAt: this.refreshExpiry(),
    });
    return {
      accessToken: await this.signAccessToken(userId),
      refreshToken: raw,
      expiresIn: this.accessTtlSec,
    };
  }

  private signAccessToken(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }

  private newOpaqueToken(): string {
    return randomBytes(48).toString("base64url");
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
  }
}
