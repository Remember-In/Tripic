import { DisabledKakaoWebLoginAdapter } from "@/auth/adapters/disabled-kakao-web-login.adapter";
import { KakaoAuthApiAdapter } from "@/auth/adapters/kakao-auth-api.adapter";
import type { KakaoAuthClient } from "@/auth/ports/kakao-auth-client.port";
import type { KakaoWebConfig } from "@/config/kakao-web-config";

/**
 * 카카오 웹 설정 여부에 따라 code 교환 포트에 연결할 adapter 를 고른다 (docs/15 §2).
 * 확장은 provider 배선으로 — AuthService 는 어느 adapter 가 붙었는지 모른다.
 */
export const selectKakaoAuthClient = (
  kakaoWeb: KakaoWebConfig | null,
): KakaoAuthClient =>
  kakaoWeb
    ? new KakaoAuthApiAdapter(kakaoWeb)
    : new DisabledKakaoWebLoginAdapter();
