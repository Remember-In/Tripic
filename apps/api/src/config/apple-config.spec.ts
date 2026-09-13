import { generateKeyPairSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { readAppleConfig } from "@/config/apple-config";
import { validateEnv, type Env } from "@/config/env";

const applePrivateKey = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

const baseEnv = {
  DATABASE_URL: "postgresql://x:x@127.0.0.1:5432/x",
  JWT_ACCESS_SECRET: "0123456789abcdef0123456789abcdef",
  KAKAO_APP_ID: "123456",
};

describe("readAppleConfig (docs/14 §7)", () => {
  it("Apple env 가 모두 있으면 어댑터가 쓸 설정 묶음을 돌려준다", () => {
    const encryptionKey = randomBytes(32).toString("base64");
    const config = new ConfigService<Env, true>(
      validateEnv({
        ...baseEnv,
        APPLE_CLIENT_ID: "com.tripic.app",
        APPLE_TEAM_ID: "TEAM123456",
        APPLE_KEY_ID: "KEY1234567",
        APPLE_PRIVATE_KEY: applePrivateKey,
        SOCIAL_TOKEN_ENCRYPTION_KEY: encryptionKey,
      }),
    );

    expect(readAppleConfig(config)).toEqual({
      clientId: "com.tripic.app",
      teamId: "TEAM123456",
      keyId: "KEY1234567",
      privateKey: applePrivateKey,
      tokenEncryptionKey: encryptionKey,
    });
  });

  it("Apple env 를 비운 서버면 null — Apple 로그인 비활성 (docs/14 §7.1)", () => {
    const config = new ConfigService<Env, true>(validateEnv(baseEnv));

    expect(readAppleConfig(config)).toBeNull();
  });
});
