import { describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { readKakaoWebConfig } from "@/config/kakao-web-config";
import { validateEnv, type Env } from "@/config/env";

const baseEnv = {
  DATABASE_URL: "postgresql://x:x@127.0.0.1:5432/x",
  JWT_ACCESS_SECRET: "0123456789abcdef0123456789abcdef",
  KAKAO_APP_ID: "123456",
};

const configOf = (overrides: Record<string, string> = {}) =>
  new ConfigService<Env, true>(validateEnv({ ...baseEnv, ...overrides }));

describe("readKakaoWebConfig (docs/15 §2)", () => {
  it("카카오 웹 env 가 모두 있으면 어댑터가 쓸 설정 묶음을 돌려준다", () => {
    const config = configOf({
      KAKAO_WEB_REST_API_KEY: "kakao-rest-api-key",
      KAKAO_WEB_REDIRECT_URIS:
        "https://tripic.example/auth/kakao/callback,http://localhost:5173/auth/kakao/callback",
      KAKAO_WEB_CLIENT_SECRET: "kakao-client-secret",
    });

    expect(readKakaoWebConfig(config)).toEqual({
      restApiKey: "kakao-rest-api-key",
      redirectUris: [
        "https://tripic.example/auth/kakao/callback",
        "http://localhost:5173/auth/kakao/callback",
      ],
      clientSecret: "kakao-client-secret",
    });
  });

  it("client secret 을 켜지 않은 서버면 clientSecret 은 null 이다", () => {
    const config = configOf({
      KAKAO_WEB_REST_API_KEY: "kakao-rest-api-key",
      KAKAO_WEB_REDIRECT_URIS: "https://tripic.example/auth/kakao/callback",
    });

    expect(readKakaoWebConfig(config)?.clientSecret).toBeNull();
  });

  it("카카오 웹 env 를 비운 서버면 null — 웹 카카오 로그인 비활성", () => {
    expect(readKakaoWebConfig(configOf())).toBeNull();
  });
});
