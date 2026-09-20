import { BadGatewayException, UnauthorizedException } from "@nestjs/common";
import { spec } from "pactum";
import {
  socialLoginResultSchema,
  type SocialLoginResult,
} from "@tripic/shared";
import type { AppleAuthClient } from "@/auth/ports/apple-auth-client.port";
import type {
  AppleIdentityVerifier,
  AppleNotificationEvent,
} from "@/auth/ports/apple-identity-verifier.port";

/**
 * Apple 서버 stub (port 교체, CLAUDE.md) — 서명 검증·REST 호출만 대체하고
 * 암호화·DB 저장·세션 발급은 실제 구현을 그대로 탄다.
 */

/** "apple-valid-<sub>" identity token 만 통과. 알림 payload 는 "<type>|<sub>", "forged" 는 서명 오류 */
export const appleVerifierStub: AppleIdentityVerifier = {
  async verifyIdentityToken(identityToken) {
    if (!identityToken.startsWith("apple-valid-")) {
      throw new UnauthorizedException("invalid apple identity token");
    }
    return { appleUserId: identityToken.slice("apple-valid-".length) };
  },
  async verifyNotification(payload): Promise<AppleNotificationEvent> {
    const [type, appleUserId] = payload.split("|");
    if (!type || !appleUserId) {
      throw new UnauthorizedException("invalid apple notification signature");
    }
    return { type, appleUserId };
  },
};

/** "apple-code-<sub>" 는 "apple-rt-<sub>" 로 교환된다. revoke 호출은 기록하고, 장애를 흉내 낼 수 있다 */
export class AppleApiStub implements AppleAuthClient {
  revoked: string[] = [];
  outage = false;

  async exchangeAuthorizationCode(authorizationCode: string) {
    if (!authorizationCode.startsWith("apple-code-")) {
      throw new UnauthorizedException("invalid apple authorization code");
    }
    const appleUserId = authorizationCode.slice("apple-code-".length);
    return { refreshToken: `apple-rt-${appleUserId}`, appleUserId };
  }

  async revokeRefreshToken(refreshToken: string) {
    if (this.outage)
      throw new BadGatewayException("apple auth api unreachable");
    this.revoked.push(refreshToken);
  }
}

export const loginWithApple = async (sub: string): Promise<SocialLoginResult> =>
  socialLoginResultSchema.parse(
    await spec()
      .post("/auth/apple")
      .withJson({
        identityToken: `apple-valid-${sub}`,
        authorizationCode: `apple-code-${sub}`,
      })
      .expectStatus(201)
      .returns("res.body"),
  );

export const notifyApple = (type: string, sub: string) =>
  spec()
    .post("/auth/apple/notifications")
    .withJson({ payload: `${type}|${sub}` });
