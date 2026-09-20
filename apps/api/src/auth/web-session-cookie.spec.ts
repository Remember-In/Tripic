import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  REFRESH_COOKIE_CLEAR_OPTIONS,
  REFRESH_COOKIE_NAME,
  readRefreshCookie,
  refreshCookieOptions,
  shouldClearRefreshCookie,
} from "@/auth/web-session-cookie";

/**
 * 웹 refresh token 쿠키의 읽기·속성 계약 (docs/15 §3).
 * 쿠키를 읽는 라우트가 둘뿐이라 전역 미들웨어 대신 순수 함수로 파싱한다.
 */
describe("readRefreshCookie", () => {
  it("여러 쿠키 사이에서 refresh token 을 꺼낸다", () => {
    expect(readRefreshCookie(`a=1; ${REFRESH_COOKIE_NAME}=abc; b=2`)).toBe(
      "abc",
    );
  });

  it("쿠키가 하나뿐이어도 꺼낸다", () => {
    expect(readRefreshCookie(`${REFRESH_COOKIE_NAME}=abc`)).toBe("abc");
  });

  it("Cookie 헤더가 없으면 null", () => {
    expect(readRefreshCookie(undefined)).toBeNull();
  });

  it("빈 Cookie 헤더면 null", () => {
    expect(readRefreshCookie("")).toBeNull();
  });

  it("다른 쿠키만 있으면 null", () => {
    expect(readRefreshCookie("a=1; b=2")).toBeNull();
  });

  it("이름이 접미로 겹치는 쿠키를 값으로 오인하지 않는다", () => {
    expect(readRefreshCookie(`x${REFRESH_COOKIE_NAME}=zzz`)).toBeNull();
  });

  it("이름이 접두로 겹치는 쿠키를 값으로 오인하지 않는다", () => {
    expect(readRefreshCookie(`${REFRESH_COOKIE_NAME}x=zzz`)).toBeNull();
  });

  it("값이 비면 null — 없는 것과 같게 다룬다", () => {
    expect(readRefreshCookie(`${REFRESH_COOKIE_NAME}=`)).toBeNull();
  });

  it("값에 = 가 있어도 첫 = 만 구분자로 쓴다", () => {
    expect(readRefreshCookie(`${REFRESH_COOKIE_NAME}=a=b=c`)).toBe("a=b=c");
  });

  it("앞뒤 공백을 다듬는다", () => {
    expect(readRefreshCookie(`a=1;   ${REFRESH_COOKIE_NAME}=abc  `)).toBe(
      "abc",
    );
  });

  it("실제 refresh token(base64url)을 그대로 돌려준다", () => {
    const token = randomBytes(48).toString("base64url");

    expect(readRefreshCookie(`${REFRESH_COOKIE_NAME}=${token}`)).toBe(token);
  });
});

describe("refreshCookieOptions", () => {
  it("HttpOnly·Secure·SameSite=Lax 로 내려간다", () => {
    const options = refreshCookieOptions(30);

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("lax");
  });

  it("Path 는 / — 웹은 프록시가 /api 를 덧붙여 호출하므로 좁히면 쿠키가 실리지 않는다", () => {
    expect(refreshCookieOptions(30).path).toBe("/");
  });

  it("Domain 을 지정하지 않는다 — 브라우저가 보는 호스트는 프록시라 host-only 여야 저장된다", () => {
    const options = refreshCookieOptions(30);

    expect(options.domain).toBeUndefined();
    expect(Object.keys(options)).not.toContain("domain");
  });

  /**
   * maxAge 가 없으면 세션 쿠키가 되어 브라우저를 닫을 때 사라진다.
   * refresh token 은 DB 에서 30일 살아 있는데 쿠키만 먼저 죽으면
   * "로그인 유지" 가 깨지고 revoke 되지 않은 토큰 행만 남는다.
   */
  it("refresh token 수명만큼 maxAge 를 준다 — 세션 쿠키가 되면 안 된다", () => {
    expect(refreshCookieOptions(30).maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    expect(refreshCookieOptions(1).maxAge).toBe(24 * 60 * 60 * 1000);
  });
});

/**
 * 실패했다고 무조건 쿠키를 지우면, DB 장애처럼 재시도로 복구되는 상황에서
 * 아직 살아 있는 refresh token 을 버려 사용자를 영구 로그아웃시킨다.
 */
describe("shouldClearRefreshCookie", () => {
  it("토큰이 죽은 경우(401)에는 지운다", () => {
    expect(
      shouldClearRefreshCookie(
        new UnauthorizedException("refresh token reuse detected"),
      ),
    ).toBe(true);
  });

  it("일시적인 서버 오류에서는 지우지 않는다 — 재시도로 복구할 수 있어야 한다", () => {
    expect(shouldClearRefreshCookie(new Error("db connection lost"))).toBe(
      false,
    );
    expect(shouldClearRefreshCookie(new ServiceUnavailableException())).toBe(
      false,
    );
    expect(shouldClearRefreshCookie(new InternalServerErrorException())).toBe(
      false,
    );
  });

  it("Error 가 아닌 값에도 안전하다", () => {
    expect(shouldClearRefreshCookie(undefined)).toBe(false);
    expect(shouldClearRefreshCookie("boom")).toBe(false);
  });
});

describe("REFRESH_COOKIE_CLEAR_OPTIONS", () => {
  /** 삭제는 속성이 일치해야 같은 쿠키를 지운다 — maxAge 만 빠진다 */
  it("발급과 같은 속성이되 maxAge 는 없다", () => {
    const issued = refreshCookieOptions(30);

    expect(REFRESH_COOKIE_CLEAR_OPTIONS.httpOnly).toBe(issued.httpOnly);
    expect(REFRESH_COOKIE_CLEAR_OPTIONS.secure).toBe(issued.secure);
    expect(REFRESH_COOKIE_CLEAR_OPTIONS.sameSite).toBe(issued.sameSite);
    expect(REFRESH_COOKIE_CLEAR_OPTIONS.path).toBe(issued.path);
    expect(REFRESH_COOKIE_CLEAR_OPTIONS.domain).toBeUndefined();
    expect(REFRESH_COOKIE_CLEAR_OPTIONS.maxAge).toBeUndefined();
  });
});
