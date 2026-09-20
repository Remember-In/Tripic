import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
  readRefreshCookie,
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

describe("REFRESH_COOKIE_OPTIONS", () => {
  it("HttpOnly·Secure·SameSite=Lax 로 내려간다", () => {
    expect(REFRESH_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(REFRESH_COOKIE_OPTIONS.secure).toBe(true);
    expect(REFRESH_COOKIE_OPTIONS.sameSite).toBe("lax");
  });

  it("Path 는 / — 웹은 프록시가 /api 를 덧붙여 호출하므로 좁히면 쿠키가 실리지 않는다", () => {
    expect(REFRESH_COOKIE_OPTIONS.path).toBe("/");
  });

  it("Domain 을 지정하지 않는다 — 브라우저가 보는 호스트는 프록시라 host-only 여야 저장된다", () => {
    expect(REFRESH_COOKIE_OPTIONS.domain).toBeUndefined();
    expect(Object.keys(REFRESH_COOKIE_OPTIONS)).not.toContain("domain");
  });
});
