export const KAKAO_AUTH_CLIENT = Symbol("KakaoAuthClient");

export interface KakaoCodeExchange {
  /** 카카오가 redirect 로 돌려준 authorization code */
  code: string;
  /** 인가 요청에 쓴 것과 같은 redirect uri — 서버 허용목록과 대조한다 */
  redirectUri: string;
}

/**
 * 카카오 OAuth authorization code 교환 outbound port (docs/15 §2).
 *
 * 웹 전용이다 — 네이티브는 앱이 받은 access token 을 그대로 보내므로 이 port 를 타지 않는다.
 * 교환한 access token 은 기존 `KakaoVerifier` 로 넘겨 app_id 대조를 거치므로,
 * 계정 생성 경로가 네이티브와 완전히 같아진다.
 *
 * 실패는 Nest 예외 의미론을 따른다:
 * 허용하지 않은 redirect uri → 400, 만료·재사용 code → 401, 그 밖의 카카오 오류·장애 → 502.
 */
export interface KakaoAuthClient {
  exchangeAuthorizationCode(
    input: KakaoCodeExchange,
  ): Promise<{ kakaoAccessToken: string }>;
}
