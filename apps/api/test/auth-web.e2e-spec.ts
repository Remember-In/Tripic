import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import {
  kakaoLoginResultSchema,
  webAuthTokensSchema,
  webSocialLoginResultSchema,
} from "@tripic/shared";
import { AppModule } from "@/app.module";
import {
  KAKAO_VERIFIER,
  type KakaoVerifier,
} from "@/auth/ports/kakao-verifier.port";
import {
  KAKAO_AUTH_CLIENT,
  type KakaoAuthClient,
} from "@/auth/ports/kakao-auth-client.port";
import { REFRESH_COOKIE_NAME } from "@/auth/web-session-cookie";

/** 카카오 API stub — "valid-<id>" 형태의 토큰만 통과시킨다 (port 교체, CLAUDE.md) */
const kakaoStub: KakaoVerifier = {
  async verifyAccessToken(token: string) {
    if (!token.startsWith("valid-")) {
      throw new UnauthorizedException("invalid kakao token");
    }
    return { kakaoUserId: token.slice("valid-".length) };
  },
};

/** code 교환 stub — "web-code-<id>" 를 네이티브 stub 이 아는 "valid-<id>" 로 바꾼다 */
const kakaoAuthStub: KakaoAuthClient = {
  async exchangeAuthorizationCode({ code }) {
    if (!code.startsWith("web-code-")) {
      throw new UnauthorizedException("invalid kakao authorization code");
    }
    return { kakaoAccessToken: `valid-${code.slice("web-code-".length)}` };
  },
};

const REDIRECT_URI = "https://tripic.example/auth/kakao/callback";

/** vitest.config.e2e.ts 의 JWT_REFRESH_TTL_DAYS 와 맞춘다 */
const REFRESH_TTL_DAYS = 30;

interface RefreshCookie {
  value: string;
  attributes: Map<string, string>;
}

const setCookieHeaders = (headers: unknown): string[] => {
  if (!headers || typeof headers !== "object" || !("set-cookie" in headers)) {
    return [];
  }
  const raw: unknown = headers["set-cookie"];
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string");
  }
  return typeof raw === "string" ? [raw] : [];
};

/** Set-Cookie 를 속성 단위로 읽는다 — 정규식으로 뭉뚱그리면 Path 오타를 놓친다 */
const parseRefreshCookie = (headers: unknown): RefreshCookie | null => {
  const header = setCookieHeaders(headers).find((cookie) =>
    cookie.startsWith(`${REFRESH_COOKIE_NAME}=`),
  );
  if (!header) {
    return null;
  }

  const [pair, ...rest] = header.split(";");
  const attributes = new Map<string, string>();
  for (const attribute of rest) {
    const separator = attribute.indexOf("=");
    if (separator === -1) {
      attributes.set(attribute.trim().toLowerCase(), "");
    } else {
      attributes.set(
        attribute.slice(0, separator).trim().toLowerCase(),
        attribute.slice(separator + 1).trim(),
      );
    }
  }

  return { value: pair.slice(pair.indexOf("=") + 1), attributes };
};

const requireCookie = (headers: unknown): RefreshCookie => {
  const cookie = parseRefreshCookie(headers);
  if (!cookie) {
    throw new Error("Set-Cookie 에 refresh 쿠키가 없다");
  }
  return cookie;
};

/** 삭제 지시인지 — 값이 비고 만료가 과거다 */
const isDeletion = (cookie: RefreshCookie): boolean => {
  if (cookie.value !== "") {
    return false;
  }
  const expires = cookie.attributes.get("expires");
  return expires !== undefined && new Date(expires).getTime() <= Date.now();
};

/** pactum 은 returns 를 여러 번 부르면 부른 순서대로 배열로 돌려준다 */
const bodyAndHeaders = (returned: unknown): [unknown, unknown] =>
  Array.isArray(returned) ? [returned[0], returned[1]] : [undefined, undefined];

const webLogin = async (id: string) => {
  const headers: unknown = await spec()
    .post("/auth/kakao/web")
    .withJson({ code: `web-code-${id}`, redirectUri: REDIRECT_URI })
    .expectStatus(201)
    .returns("res.headers");
  return requireCookie(headers);
};

const webSession = async (id: string) => {
  const [body, headers] = bodyAndHeaders(
    await spec()
      .post("/auth/kakao/web")
      .withJson({ code: `web-code-${id}`, redirectUri: REDIRECT_URI })
      .expectStatus(201)
      .returns("res.body")
      .returns("res.headers"),
  );
  return {
    cookie: requireCookie(headers),
    session: webSocialLoginResultSchema.parse(body),
  };
};

describe("웹 인증 (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KAKAO_VERIFIER)
      .useValue(kakaoStub)
      .overrideProvider(KAKAO_AUTH_CLIENT)
      .useValue(kakaoAuthStub)
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    const url = await app.getUrl();
    request.setBaseUrl(url.replace("[::1]", "localhost"));
  });

  afterAll(async () => {
    await app?.close();
  });

  describe("POST /auth/kakao/web", () => {
    it("code 를 교환해 세션을 발급한다", async () => {
      const body: unknown = await spec()
        .post("/auth/kakao/web")
        .withJson({ code: "web-code-web-1", redirectUri: REDIRECT_URI })
        .expectStatus(201)
        .returns("res.body");

      const session = webSocialLoginResultSchema.parse(body);
      expect(session.isNewUser).toBe(true);
      expect(session.accessToken.length).toBeGreaterThan(0);
    });

    /**
     * 스키마는 여분 키를 조용히 버리므로 parse 통과만으로는 부족하다.
     * refresh token 이 본문으로 새는 회귀를 여기서 직접 막는다 (docs/15 §3).
     */
    it("본문에 refreshToken 을 담지 않는다", async () => {
      const body: unknown = await spec()
        .post("/auth/kakao/web")
        .withJson({ code: "web-code-web-2", redirectUri: REDIRECT_URI })
        .expectStatus(201)
        .returns("res.body");

      expect(body).not.toHaveProperty("refreshToken");
    });

    it("refresh token 을 HttpOnly·Secure·SameSite=Lax·Path=/ 쿠키로 내린다", async () => {
      const cookie = await webLogin("web-3");

      expect(cookie.value.length).toBeGreaterThan(0);
      expect(cookie.attributes.has("httponly")).toBe(true);
      expect(cookie.attributes.has("secure")).toBe(true);
      expect(cookie.attributes.get("samesite")?.toLowerCase()).toBe("lax");
      expect(cookie.attributes.get("path")).toBe("/");
    });

    it("쿠키에 Domain 을 지정하지 않는다 — 프록시 뒤에서도 저장되도록 host-only 로 둔다", async () => {
      const cookie = await webLogin("web-4");

      expect(cookie.attributes.has("domain")).toBe(false);
    });

    /**
     * Max-Age 가 없으면 세션 쿠키가 되어 브라우저를 닫을 때 사라진다.
     * refresh token 은 DB 에서 JWT_REFRESH_TTL_DAYS 만큼 살아 있으므로 수명이 맞아야 한다.
     */
    it("refresh token 수명만큼 Max-Age 를 준다 — 세션 쿠키가 되면 안 된다", async () => {
      const cookie = await webLogin("web-5");
      const maxAge = cookie.attributes.get("max-age");

      expect(maxAge).toBeDefined();
      expect(Number(maxAge)).toBe(REFRESH_TTL_DAYS * 24 * 60 * 60);
    });

    it("교환할 수 없는 code 는 401", async () => {
      await spec()
        .post("/auth/kakao/web")
        .withJson({ code: "expired", redirectUri: REDIRECT_URI })
        .expectStatus(401);
    });

    it("요청 형식이 어긋나면 400", async () => {
      await spec().post("/auth/kakao/web").withJson({}).expectStatus(400);
      await spec()
        .post("/auth/kakao/web")
        .withJson({ code: "web-code-x", redirectUri: "not-a-url" })
        .expectStatus(400);
    });
  });

  describe("POST /auth/refresh/web", () => {
    it("쿠키의 refresh token 을 회전시키고 새 쿠키를 내린다", async () => {
      const issued = await webLogin("web-refresh-1");

      const [body, headers] = bodyAndHeaders(
        await spec()
          .post("/auth/refresh/web")
          .withCookies(REFRESH_COOKIE_NAME, issued.value)
          .expectStatus(200)
          .returns("res.body")
          .returns("res.headers"),
      );

      const tokens = webAuthTokensSchema.parse(body);
      expect(tokens.accessToken.length).toBeGreaterThan(0);
      expect(body).not.toHaveProperty("refreshToken");
      expect(requireCookie(headers).value).not.toBe(issued.value);
    });

    it("쿠키가 없으면 401", async () => {
      await spec().post("/auth/refresh/web").expectStatus(401);
    });

    it("회전된 옛 쿠키를 다시 쓰면 401 이고 쿠키를 지운다", async () => {
      const issued = await webLogin("web-refresh-2");
      await spec()
        .post("/auth/refresh/web")
        .withCookies(REFRESH_COOKIE_NAME, issued.value)
        .expectStatus(200);

      const headers: unknown = await spec()
        .post("/auth/refresh/web")
        .withCookies(REFRESH_COOKIE_NAME, issued.value)
        .expectStatus(401)
        .returns("res.headers");

      expect(isDeletion(requireCookie(headers))).toBe(true);
    });

    it("재사용이 감지되면 같은 family 의 새 토큰도 무효가 된다", async () => {
      const issued = await webLogin("web-refresh-3");
      const rotatedHeaders: unknown = await spec()
        .post("/auth/refresh/web")
        .withCookies(REFRESH_COOKIE_NAME, issued.value)
        .expectStatus(200)
        .returns("res.headers");
      const rotated = requireCookie(rotatedHeaders);

      await spec()
        .post("/auth/refresh/web")
        .withCookies(REFRESH_COOKIE_NAME, issued.value)
        .expectStatus(401);

      await spec()
        .post("/auth/refresh/web")
        .withCookies(REFRESH_COOKIE_NAME, rotated.value)
        .expectStatus(401);
    });
  });

  describe("POST /auth/logout/web", () => {
    it("세션을 끊고 쿠키를 지운다", async () => {
      const [body, loginHeaders] = bodyAndHeaders(
        await spec()
          .post("/auth/kakao/web")
          .withJson({
            code: "web-code-web-logout-1",
            redirectUri: REDIRECT_URI,
          })
          .expectStatus(201)
          .returns("res.body")
          .returns("res.headers"),
      );
      const session = webSocialLoginResultSchema.parse(body);
      const cookie = requireCookie(loginHeaders);

      const headers: unknown = await spec()
        .post("/auth/logout/web")
        .withBearerToken(session.accessToken)
        .withCookies(REFRESH_COOKIE_NAME, cookie.value)
        .expectStatus(204)
        .returns("res.headers");

      expect(isDeletion(requireCookie(headers))).toBe(true);
      await spec()
        .post("/auth/refresh/web")
        .withCookies(REFRESH_COOKIE_NAME, cookie.value)
        .expectStatus(401);
    });

    it("쿠키가 없어도 204 — 멱등하게 끝낸다", async () => {
      const session = webSocialLoginResultSchema.parse(
        await spec()
          .post("/auth/kakao/web")
          .withJson({
            code: "web-code-web-logout-2",
            redirectUri: REDIRECT_URI,
          })
          .expectStatus(201)
          .returns("res.body"),
      );

      await spec()
        .post("/auth/logout/web")
        .withBearerToken(session.accessToken)
        .expectStatus(204);
    });

    it("인증 없이 호출하면 401", async () => {
      await spec().post("/auth/logout/web").expectStatus(401);
    });

    it("남의 refresh 쿠키로는 세션을 끊지 못한다", async () => {
      const victim = await webLogin("web-logout-victim");
      const attacker = webSocialLoginResultSchema.parse(
        await spec()
          .post("/auth/kakao/web")
          .withJson({
            code: "web-code-web-logout-attacker",
            redirectUri: REDIRECT_URI,
          })
          .expectStatus(201)
          .returns("res.body"),
      );

      await spec()
        .post("/auth/logout/web")
        .withBearerToken(attacker.accessToken)
        .withCookies(REFRESH_COOKIE_NAME, victim.value)
        .expectStatus(204);

      await spec()
        .post("/auth/refresh/web")
        .withCookies(REFRESH_COOKIE_NAME, victim.value)
        .expectStatus(200);
    });
  });

  describe("웹 회원탈퇴와 재가입", () => {
    it("탈퇴하면 세션이 무효화되고 같은 카카오 계정은 새 사용자로 재가입한다", async () => {
      const before = await webSession("web-withdraw-rejoin");

      await spec()
        .delete("/users/me")
        .withBearerToken(before.session.accessToken)
        .expectStatus(204);

      const refreshHeaders: unknown = await spec()
        .post("/auth/refresh/web")
        .withCookies(REFRESH_COOKIE_NAME, before.cookie.value)
        .expectStatus(401)
        .returns("res.headers");
      expect(isDeletion(requireCookie(refreshHeaders))).toBe(true);

      const after = await webSession("web-withdraw-rejoin");
      expect(after.session.isNewUser).toBe(true);
      expect(after.session.user.id).not.toBe(before.session.user.id);
    });
  });

  describe("네이티브 경로와의 공존", () => {
    it("기존 body 방식 로그인·회전·로그아웃이 그대로 동작한다", async () => {
      const session = kakaoLoginResultSchema.parse(
        await spec()
          .post("/auth/kakao")
          .withJson({ kakaoAccessToken: "valid-native-1" })
          .expectStatus(201)
          .returns("res.body"),
      );

      const rotated = await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: session.refreshToken })
        .expectStatus(200)
        .returns("res.body");

      await spec()
        .post("/auth/logout")
        .withBearerToken(session.accessToken)
        .withJson({
          refreshToken: kakaoLoginResultSchema
            .pick({ refreshToken: true })
            .parse(rotated).refreshToken,
        })
        .expectStatus(204);
    });

    it("네이티브가 받은 refresh token 을 쿠키에 담아도 회전된다 — 저장소가 하나다", async () => {
      const session = kakaoLoginResultSchema.parse(
        await spec()
          .post("/auth/kakao")
          .withJson({ kakaoAccessToken: "valid-native-2" })
          .expectStatus(201)
          .returns("res.body"),
      );

      await spec()
        .post("/auth/refresh/web")
        .withCookies(REFRESH_COOKIE_NAME, session.refreshToken)
        .expectStatus(200);
    });
  });
});
