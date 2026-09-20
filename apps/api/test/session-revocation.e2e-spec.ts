import { afterAll, beforeAll, describe, it } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import { z } from "zod";
import { socialLoginResultSchema } from "@tripic/shared";
import { AppModule } from "@/app.module";
import {
  KAKAO_VERIFIER,
  type KakaoVerifier,
} from "@/auth/ports/kakao-verifier.port";

const kakaoStub: KakaoVerifier = {
  async verifyAccessToken(token: string) {
    if (!token.startsWith("valid-")) {
      throw new UnauthorizedException("invalid kakao token");
    }
    return { kakaoUserId: token.slice("valid-".length) };
  },
};

const session = async (kakaoToken: string) => {
  const body: unknown = await spec()
    .post("/auth/kakao")
    .withJson({ kakaoAccessToken: kakaoToken })
    .expectStatus(201)
    .returns("res.body");
  return socialLoginResultSchema.parse(body);
};

/**
 * access token 은 서버가 지울 수 없는 JWT 다. 로그아웃·탈퇴가 그 토큰까지 즉시 무효화하지 않으면
 * 최대 TTL(15분) 동안 남의 기기에서 기능이 계속 쓰인다 (docs/10 §3).
 */
describe("세션 폐기 (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KAKAO_VERIFIER)
      .useValue(kakaoStub)
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    request.setBaseUrl((await app.getUrl()).replace("[::1]", "localhost"));
  });

  afterAll(async () => {
    await app?.close();
  });

  it("로그인 직후에는 보호 라우트가 동작한다", async () => {
    const me = await session("valid-revoke-1");

    await spec()
      .get("/users/me")
      .withBearerToken(me.accessToken)
      .expectStatus(200);
  });

  it("로그아웃하면 그 access token 이 즉시 막힌다", async () => {
    const me = await session("valid-revoke-2");

    await spec()
      .post("/auth/logout")
      .withBearerToken(me.accessToken)
      .withJson({ refreshToken: me.refreshToken })
      .expectStatus(204);

    await spec()
      .get("/users/me")
      .withBearerToken(me.accessToken)
      .expectStatus(401);
    await spec()
      .get("/records")
      .withBearerToken(me.accessToken)
      .expectStatus(401);
  });

  /** 예전에는 행이 cascade 로 지워져 `[]` + 200 이 나왔다 — 200 이면 회귀다 */
  it("탈퇴하면 그 access token 으로 기록 목록도 막힌다", async () => {
    const me = await session("valid-revoke-3");

    await spec()
      .delete("/users/me")
      .withBearerToken(me.accessToken)
      .expectStatus(204);

    await spec()
      .get("/records")
      .withBearerToken(me.accessToken)
      .expectStatus(401);
    await spec()
      .get("/users/me")
      .withBearerToken(me.accessToken)
      .expectStatus(401);
  });

  it("한 기기에서 로그아웃해도 다른 기기 세션은 살아 있다", async () => {
    const phone = await session("valid-revoke-4");
    const laptop = await session("valid-revoke-4");

    await spec()
      .post("/auth/logout")
      .withBearerToken(phone.accessToken)
      .withJson({ refreshToken: phone.refreshToken })
      .expectStatus(204);

    await spec()
      .get("/users/me")
      .withBearerToken(phone.accessToken)
      .expectStatus(401);
    await spec()
      .get("/users/me")
      .withBearerToken(laptop.accessToken)
      .expectStatus(200);
  });

  it("회전하면 새 access token 이 동작하고 같은 세션이 유지된다", async () => {
    const me = await session("valid-revoke-5");

    const rotated = z
      .object({ accessToken: z.string().min(1) })
      .parse(
        await spec()
          .post("/auth/refresh")
          .withJson({ refreshToken: me.refreshToken })
          .expectStatus(200)
          .returns("res.body"),
      );

    await spec()
      .get("/users/me")
      .withBearerToken(rotated.accessToken)
      .expectStatus(200);
  });

  it("공개 라우트는 세션과 무관하게 열려 있다", async () => {
    await spec().get("/health").expectStatus(200);
    await spec().get("/app-config").expectStatus(200);
  });
});
