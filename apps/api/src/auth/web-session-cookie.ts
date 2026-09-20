import type { CookieOptions } from "express";

/** 웹 refresh token 쿠키 이름 — 다른 서비스 쿠키와 섞이지 않게 접두사를 둔다 */
export const REFRESH_COOKIE_NAME = "tripic_rt";

/**
 * 웹 refresh token 쿠키 속성 (docs/15 §3).
 *
 * - Path 는 "/" 다. 웹은 Vercel rewrite / Vite proxy 가 앞에 `/api` 를 덧붙여 호출하므로
 *   `/auth` 로 좁히면 브라우저가 저장은 하되 `/api/auth/...` 요청에 싣지 않는다.
 *   `/api/auth` 로 두는 것은 웹의 프록시 프리픽스를 서버에 하드코딩하는 계층 위반이다.
 * - Domain 은 지정하지 않는다(host-only). 브라우저가 보는 호스트는 API 서버가 아니라
 *   프록시(Vercel·localhost)라, Domain 을 주면 불일치로 쿠키가 폐기된다.
 * - Secure 는 환경 분기 없이 항상 켠다. 보안 플래그를 환경마다 다르게 두면 사고가 난다.
 *   Chrome·Firefox 는 http://localhost 를 secure context 로 취급해 로컬 개발에도 문제가 없다.
 * - SameSite=Lax 면 크로스사이트 POST 에 쿠키가 실리지 않아 refresh CSRF 가 차단된다.
 *   CORS 헤더도 내보내지 않으므로 공격자 페이지는 응답 본문(access token)을 읽을 수 없다.
 */
export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
};

/**
 * `Cookie` 헤더에서 refresh token 을 꺼낸다. 없거나 비어 있으면 null.
 *
 * 값은 base64url(URI 안전 문자)이라 express 가 인코딩하지 않으므로 디코딩하지 않는다.
 */
export function readRefreshCookie(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) {
      continue;
    }

    if (pair.slice(0, separator).trim() !== REFRESH_COOKIE_NAME) {
      continue;
    }

    const value = pair.slice(separator + 1).trim();
    return value.length > 0 ? value : null;
  }

  return null;
}
