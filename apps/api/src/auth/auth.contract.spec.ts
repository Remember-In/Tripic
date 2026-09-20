import { describe, expect, it } from "vitest";
import {
  kakaoWebLoginSchema,
  webAuthTokensSchema,
  webSocialLoginResultSchema,
} from "@tripic/shared";

/**
 * 웹 인증 계약(@tripic/shared)의 경계값을 고정한다.
 * 라우트는 이 스키마를 그대로 쓰므로 여기서 통과/거부가 곧 400 여부가 된다 (docs/15 §2).
 */
describe("웹 인증 요청 계약", () => {
  describe("kakaoWebLoginSchema", () => {
    const valid = {
      code: "kakao-authorization-code",
      redirectUri: "https://tripic.example/auth/kakao/callback",
    };

    it("code 와 redirectUri 가 있으면 통과한다", () => {
      expect(kakaoWebLoginSchema.parse(valid)).toEqual(valid);
    });

    it("빈 code 는 거부한다", () => {
      expect(
        kakaoWebLoginSchema.safeParse({ ...valid, code: "" }).success,
      ).toBe(false);
    });

    it("code 가 없으면 거부한다", () => {
      expect(
        kakaoWebLoginSchema.safeParse({ redirectUri: valid.redirectUri })
          .success,
      ).toBe(false);
    });

    it("redirectUri 가 url 이 아니면 거부한다 — 서버 허용목록과 대조하기 전에 형식부터 막는다", () => {
      expect(
        kakaoWebLoginSchema.safeParse({ ...valid, redirectUri: "not-a-url" })
          .success,
      ).toBe(false);
    });

    it("redirectUri 가 없으면 거부한다", () => {
      expect(kakaoWebLoginSchema.safeParse({ code: valid.code }).success).toBe(
        false,
      );
    });
  });

  /**
   * 웹 응답에는 refresh token 이 본문으로 나가지 않는다 — HttpOnly 쿠키로만 내려간다 (docs/15 §3).
   * 주의: 스키마는 여분 키를 조용히 버리므로 "본문에 refreshToken 이 없다"는
   * parse 통과만으로는 보장되지 않는다. e2e 에서 별도 단언으로 고정한다.
   */
  describe("웹 세션 응답 계약", () => {
    it("webAuthTokensSchema 에는 refreshToken 필드가 없다", () => {
      expect(Object.keys(webAuthTokensSchema.shape)).toEqual(
        expect.arrayContaining(["accessToken", "expiresIn"]),
      );
      expect(Object.keys(webAuthTokensSchema.shape)).not.toContain(
        "refreshToken",
      );
    });

    it("webSocialLoginResultSchema 에는 refreshToken 필드가 없다", () => {
      expect(Object.keys(webSocialLoginResultSchema.shape)).not.toContain(
        "refreshToken",
      );
    });

    it("refresh token 없는 세션 응답을 통과시킨다", () => {
      const parsed = webSocialLoginResultSchema.parse({
        accessToken: "access-token",
        expiresIn: 900,
        isNewUser: true,
        user: { id: "user-1", nickname: null },
      });

      expect(parsed.isNewUser).toBe(true);
      expect(parsed.user.nickname).toBeNull();
    });

    it("accessToken 이 비면 거부한다", () => {
      expect(
        webAuthTokensSchema.safeParse({ accessToken: "", expiresIn: 900 })
          .success,
      ).toBe(false);
    });
  });
});
