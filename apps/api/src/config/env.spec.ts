import { generateKeyPairSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateEnv } from "@/config/env";

const ecPrivateKey = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

const rsaPrivateKey = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

const validEnv = (overrides: Record<string, string | undefined> = {}) => ({
  DATABASE_URL: "postgresql://x:x@127.0.0.1:5432/x",
  JWT_ACCESS_SECRET: "0123456789abcdef0123456789abcdef",
  KAKAO_APP_ID: "123456",
  APPLE_CLIENT_ID: "com.tripic.app",
  APPLE_TEAM_ID: "TEAM123456",
  APPLE_KEY_ID: "KEY1234567",
  APPLE_PRIVATE_KEY: ecPrivateKey,
  SOCIAL_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  ...overrides,
});

const APPLE_KEYS = [
  "APPLE_CLIENT_ID",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
  "SOCIAL_TOKEN_ENCRYPTION_KEY",
];

/** Sign in with Apple 환경변수 계약 (docs/14 §7) — 잘못된 설정은 부팅 단계에서 막는다 */
describe("envSchema — Sign in with Apple", () => {
  it("Apple 값이 모두 올바르면 통과한다", () => {
    expect(validateEnv(validEnv())).toMatchObject({
      APPLE_CLIENT_ID: "com.tripic.app",
    });
  });

  it("Apple 값을 전부 비우면 통과한다 — Apple 로그인만 꺼진 채로 기동한다 (docs/14 §7.1)", () => {
    const withoutApple = validEnv(
      Object.fromEntries(APPLE_KEYS.map((key) => [key, undefined])),
    );

    expect(validateEnv(withoutApple).APPLE_CLIENT_ID).toBeUndefined();
  });

  it.each(APPLE_KEYS)(
    "%s 하나만 빠진 일부 설정은 설정 실수로 보고 부팅 실패",
    (key) => {
      expect(() => validateEnv(validEnv({ [key]: undefined }))).toThrow();
    },
  );

  it("Apple 값을 하나만 넣어도 부팅 실패", () => {
    const onlyClientId = validEnv(
      Object.fromEntries(
        APPLE_KEYS.filter((key) => key !== "APPLE_CLIENT_ID").map((key) => [
          key,
          undefined,
        ]),
      ),
    );

    expect(() => validateEnv(onlyClientId)).toThrow();
  });

  it("한 줄 env 에 \\n 으로 이스케이프한 .p8 도 실제 줄바꿈으로 복원해 받는다", () => {
    const escaped = ecPrivateKey.replace(/\n/g, "\\n");

    expect(
      validateEnv(validEnv({ APPLE_PRIVATE_KEY: escaped })).APPLE_PRIVATE_KEY,
    ).toBe(ecPrivateKey);
  });

  it("PEM 이 아닌 값이면 부팅 실패", () => {
    expect(() =>
      validateEnv(validEnv({ APPLE_PRIVATE_KEY: "not-a-key" })),
    ).toThrow();
  });

  it("EC 가 아닌 키(RSA)면 부팅 실패 — Apple client_secret 은 ES256 이다", () => {
    expect(() =>
      validateEnv(validEnv({ APPLE_PRIVATE_KEY: rsaPrivateKey })),
    ).toThrow();
  });

  it("암호화 키가 32바이트가 아니면 부팅 실패", () => {
    expect(() =>
      validateEnv(
        validEnv({
          SOCIAL_TOKEN_ENCRYPTION_KEY: randomBytes(16).toString("base64"),
        }),
      ),
    ).toThrow();
    expect(() =>
      validateEnv(validEnv({ SOCIAL_TOKEN_ENCRYPTION_KEY: "plain-text-key" })),
    ).toThrow();
  });
});
