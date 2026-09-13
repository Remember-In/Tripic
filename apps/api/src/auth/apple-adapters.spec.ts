import { generateKeyPairSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AesGcmTokenCipherAdapter } from "@/auth/adapters/aes-gcm-token-cipher.adapter";
import { AppleAuthApiAdapter } from "@/auth/adapters/apple-auth-api.adapter";
import { AppleJwksAdapter } from "@/auth/adapters/apple-jwks.adapter";
import { DisabledAppleLoginAdapter } from "@/auth/adapters/disabled-apple-login.adapter";
import {
  selectAppleAuthClient,
  selectAppleIdentityVerifier,
  selectProviderTokenCipher,
} from "@/auth/apple-adapters";
import type { AppleConfig } from "@/config/apple-config";

const apple: AppleConfig = {
  clientId: "com.tripic.app",
  teamId: "TEAM123456",
  keyId: "KEY1234567",
  privateKey: generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  }).privateKey,
  tokenEncryptionKey: randomBytes(32).toString("base64"),
};

/** 설정 여부에 따라 Apple 포트에 연결할 adapter 를 고른다 — 서비스는 바뀌지 않는다 (OCP) */
describe("Apple adapter 선택", () => {
  it("Apple 설정이 있으면 실제 Apple 연동 adapter 를 쓴다", () => {
    expect(selectAppleIdentityVerifier(apple)).toBeInstanceOf(AppleJwksAdapter);
    expect(selectAppleAuthClient(apple)).toBeInstanceOf(AppleAuthApiAdapter);
    expect(selectProviderTokenCipher(apple)).toBeInstanceOf(
      AesGcmTokenCipherAdapter,
    );
  });

  it("Apple 설정이 없으면 모두 비활성 adapter 를 쓴다 (docs/14 §7.1)", () => {
    expect(selectAppleIdentityVerifier(null)).toBeInstanceOf(
      DisabledAppleLoginAdapter,
    );
    expect(selectAppleAuthClient(null)).toBeInstanceOf(
      DisabledAppleLoginAdapter,
    );
    expect(selectProviderTokenCipher(null)).toBeInstanceOf(
      DisabledAppleLoginAdapter,
    );
  });
});
