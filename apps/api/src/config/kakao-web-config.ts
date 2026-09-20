import type { ConfigService } from "@nestjs/config";
import type { Env } from "@/config/env";

/** 웹 카카오 로그인 adapter 가 쓰는 설정 묶음 (docs/15 §2) */
export interface KakaoWebConfig {
  /** 카카오 REST API 키 — KAKAO_APP_ID 와 같은 카카오 애플리케이션이어야 한다 */
  restApiKey: string;
  /** 허용 redirect uri — env 검증 단계에서 http(s) 확인을 마친 목록 */
  redirectUris: readonly string[];
  /** 카카오 콘솔에서 Client Secret 을 켰을 때만 값이 있다 */
  clientSecret: string | null;
}

/**
 * 카카오 웹 env 를 설정 묶음으로 읽는다. 전부 비운 서버면 null — 웹 카카오 로그인 비활성 (docs/15 §2).
 * 일부만 설정한 경우는 env 검증이 부팅 단계에서 이미 막는다.
 */
export function readKakaoWebConfig(
  config: ConfigService<Env, true>,
): KakaoWebConfig | null {
  const restApiKey = config.get("KAKAO_WEB_REST_API_KEY", { infer: true });
  const redirectUris = config.get("KAKAO_WEB_REDIRECT_URIS", { infer: true });
  if (!restApiKey || !redirectUris || redirectUris.length === 0) {
    return null;
  }

  return {
    restApiKey,
    redirectUris,
    clientSecret:
      config.get("KAKAO_WEB_CLIENT_SECRET", { infer: true }) ?? null,
  };
}
