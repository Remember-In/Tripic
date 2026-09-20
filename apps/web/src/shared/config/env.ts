function required(value: string | undefined, name: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }
  return normalized;
}

export function kakaoLoginConfig() {
  return {
    redirectUri: required(
      import.meta.env.VITE_KAKAO_REDIRECT_URI,
      "VITE_KAKAO_REDIRECT_URI",
    ),
    restApiKey: required(
      import.meta.env.VITE_KAKAO_REST_API_KEY,
      "VITE_KAKAO_REST_API_KEY",
    ),
  };
}
