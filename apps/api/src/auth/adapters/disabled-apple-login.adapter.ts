import { ServiceUnavailableException } from "@nestjs/common";
import type { AppleAuthClient } from "@/auth/ports/apple-auth-client.port";
import type {
  AppleIdentityVerifier,
  AppleNotificationEvent,
} from "@/auth/ports/apple-identity-verifier.port";
import type { ProviderTokenCipher } from "@/auth/ports/provider-token-cipher.port";

const unavailable = () =>
  new ServiceUnavailableException("apple login is not configured");

/**
 * Apple env 를 비운 서버에서 Apple 포트 자리에 연결하는 adapter (docs/14 §7.1).
 * 모든 동작이 503 이라 Apple 가입·로그인·알림이 막히고, 저장된 Apple 토큰이 있는 계정은
 * revoke 없이 삭제되지 않는다. 서비스 코드는 설정 여부를 알 필요가 없다.
 */
export class DisabledAppleLoginAdapter
  implements AppleIdentityVerifier, AppleAuthClient, ProviderTokenCipher
{
  async verifyIdentityToken(
    _identityToken: string,
  ): Promise<{ appleUserId: string }> {
    throw unavailable();
  }

  async verifyNotification(_payload: string): Promise<AppleNotificationEvent> {
    throw unavailable();
  }

  async exchangeAuthorizationCode(_authorizationCode: string): Promise<{
    refreshToken: string;
    appleUserId: string;
  }> {
    throw unavailable();
  }

  async revokeRefreshToken(_refreshToken: string): Promise<void> {
    throw unavailable();
  }

  encrypt(_plaintext: string): string {
    throw unavailable();
  }

  decrypt(_sealed: string): string {
    throw unavailable();
  }
}
