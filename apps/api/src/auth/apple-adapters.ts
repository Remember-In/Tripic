import { AesGcmTokenCipherAdapter } from "@/auth/adapters/aes-gcm-token-cipher.adapter";
import { AppleAuthApiAdapter } from "@/auth/adapters/apple-auth-api.adapter";
import { AppleJwksAdapter } from "@/auth/adapters/apple-jwks.adapter";
import { DisabledAppleLoginAdapter } from "@/auth/adapters/disabled-apple-login.adapter";
import type { AppleAuthClient } from "@/auth/ports/apple-auth-client.port";
import type { AppleIdentityVerifier } from "@/auth/ports/apple-identity-verifier.port";
import type { ProviderTokenCipher } from "@/auth/ports/provider-token-cipher.port";
import type { AppleConfig } from "@/config/apple-config";

/**
 * Apple 설정 여부에 따라 포트에 연결할 adapter 를 고른다 (docs/14 §7.1).
 * 확장은 provider 배선으로 — AppleAuthService 는 어느 adapter 가 붙었는지 모른다.
 */
export const selectAppleIdentityVerifier = (
  apple: AppleConfig | null,
): AppleIdentityVerifier =>
  apple ? new AppleJwksAdapter(apple) : new DisabledAppleLoginAdapter();

export const selectAppleAuthClient = (
  apple: AppleConfig | null,
): AppleAuthClient =>
  apple ? new AppleAuthApiAdapter(apple) : new DisabledAppleLoginAdapter();

export const selectProviderTokenCipher = (
  apple: AppleConfig | null,
): ProviderTokenCipher =>
  apple
    ? new AesGcmTokenCipherAdapter(apple.tokenEncryptionKey)
    : new DisabledAppleLoginAdapter();
