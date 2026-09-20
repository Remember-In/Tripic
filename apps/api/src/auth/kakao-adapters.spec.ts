import { describe, expect, it } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { KakaoAuthApiAdapter } from "@/auth/adapters/kakao-auth-api.adapter";
import { DisabledKakaoWebLoginAdapter } from "@/auth/adapters/disabled-kakao-web-login.adapter";
import { selectKakaoAuthClient } from "@/auth/kakao-adapters";
import type { KakaoWebConfig } from "@/config/kakao-web-config";

const kakaoWeb: KakaoWebConfig = {
  restApiKey: "kakao-rest-api-key",
  redirectUris: ["https://tripic.example/auth/kakao/callback"],
  clientSecret: null,
};

describe("selectKakaoAuthClient (docs/15 §2)", () => {
  it("카카오 웹 설정이 있으면 실제 adapter 를 고른다", () => {
    expect(selectKakaoAuthClient(kakaoWeb)).toBeInstanceOf(KakaoAuthApiAdapter);
  });

  it("설정이 없으면 비활성 adapter 를 고른다 — 서비스는 설정 여부를 모른다", () => {
    expect(selectKakaoAuthClient(null)).toBeInstanceOf(
      DisabledKakaoWebLoginAdapter,
    );
  });
});

describe("DisabledKakaoWebLoginAdapter", () => {
  it("code 교환을 503 으로 막는다 — 네이티브 카카오 로그인은 영향받지 않는다", async () => {
    await expect(
      new DisabledKakaoWebLoginAdapter().exchangeAuthorizationCode({
        code: "authorization-code",
        redirectUri: "https://tripic.example/auth/kakao/callback",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
