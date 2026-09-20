import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import { socialLoginResultSchema } from "@tripic/shared";
import { AppModule } from "@/app.module";
import {
  KAKAO_VERIFIER,
  type KakaoVerifier,
} from "@/auth/ports/kakao-verifier.port";
import { REFRESH_COOKIE_NAME } from "@/auth/web-session-cookie";

/**
 * 카카오 웹 env 를 비운 서버 (docs/15 §2).
 * e2e 기본 env 에는 KAKAO_WEB_* 이 없으므로, KAKAO_AUTH_CLIENT 를 교체하지 않는 것만으로
 * 비활성 adapter 가 붙은 상태가 된다.
 */
const kakaoStub: KakaoVerifier = {
  async verifyAccessToken(token: string) {
    if (!token.startsWith("valid-")) {
      throw new UnauthorizedException("invalid kakao token");
    }
    return { kakaoUserId: token.slice("valid-".length) };
  },
};

describe("카카오 웹 로그인 미설정 서버 (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KAKAO_VERIFIER)
      .useValue(kakaoStub)
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    const url = await app.getUrl();
    request.setBaseUrl(url.replace("[::1]", "localhost"));
  });

  afterAll(async () => {
    await app?.close();
  });

  it("서버는 정상 기동한다 — health probe 200", async () => {
    await spec().get("/health").expectStatus(200);
  });

  it("웹 카카오 로그인은 503", async () => {
    await spec()
      .post("/auth/kakao/web")
      .withJson({
        code: "web-code-1",
        redirectUri: "https://tripic.example/auth/kakao/callback",
      })
      .expectStatus(503);
  });

  it("요청 형식 검증은 그대로 400 이다", async () => {
    await spec().post("/auth/kakao/web").withJson({}).expectStatus(400);
  });

  it("네이티브 카카오 로그인은 영향 없이 동작한다", async () => {
    const session = socialLoginResultSchema.parse(
      await spec()
        .post("/auth/kakao")
        .withJson({ kakaoAccessToken: "valid-no-web-server" })
        .expectStatus(201)
        .returns("res.body"),
    );

    expect(session.refreshToken.length).toBeGreaterThan(0);
  });

  /**
   * 쿠키 회전·로그아웃은 code 교환 port 를 타지 않는다.
   * 웹 로그인만 꺼진 것이지 세션 기능이 통째로 막히는 게 아님을 고정한다.
   */
  it("쿠키 회전은 503 이 아니라 평소처럼 401 이다", async () => {
    await spec().post("/auth/refresh/web").expectStatus(401);
    await spec()
      .post("/auth/refresh/web")
      .withCookies(REFRESH_COOKIE_NAME, "unknown-token")
      .expectStatus(401);
  });
});
