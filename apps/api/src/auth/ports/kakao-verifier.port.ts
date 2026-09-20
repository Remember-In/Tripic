export const KAKAO_VERIFIER = Symbol("KakaoVerifier");

/** 카카오 토큰 검증 outbound port — 실패는 Nest 예외(401/502) 의미론을 따른다 */
export interface KakaoVerifier {
  verifyAccessToken(kakaoAccessToken: string): Promise<{ kakaoUserId: string }>;
}
