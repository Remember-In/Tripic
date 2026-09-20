import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

/**
 * Apple env 5종을 모두 비운 서버 (docs/14 §7.1).
 * ConfigModule 이 AppModule import 시점에 env 를 읽으므로, vi.hoisted 로 import 보다 먼저 지운다.
 */
vi.hoisted(() => {
  for (const key of [
    "APPLE_CLIENT_ID",
    "APPLE_TEAM_ID",
    "APPLE_KEY_ID",
    "APPLE_PRIVATE_KEY",
    "SOCIAL_TOKEN_ENCRYPTION_KEY",
  ]) {
    delete process.env[key];
  }
});

const kakaoStub: KakaoVerifier = {
  async exchangeAuthorizationCode({ code }) {
    return code;
  },
  async verifyAccessToken(token: string) {
    if (!token.startsWith("valid-")) {
      throw new UnauthorizedException("invalid kakao token");
    }
    return { kakaoUserId: token.slice("valid-".length) };
  },
};

const appConfigFeaturesSchema = z.object({
  features: z.object({ appleLogin: z.boolean() }),
});

describe("Apple 미설정 서버 (e2e)", () => {
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

  it("/app-config 가 appleLogin=false 를 내려준다", async () => {
    const body = appConfigFeaturesSchema.parse(
      await spec().get("/app-config").expectStatus(200).returns("res.body"),
    );

    expect(body.features.appleLogin).toBe(false);
  });

  it("Apple 가입·로그인은 503", async () => {
    await spec()
      .post("/auth/apple")
      .withJson({ identityToken: "a.b.c", authorizationCode: "code" })
      .expectStatus(503);
  });

  it("Apple 서버 알림은 503 — Apple 이 재시도한다", async () => {
    await spec()
      .post("/auth/apple/notifications")
      .withJson({ payload: "a.b.c" })
      .expectStatus(503);
  });

  it("요청 형식 검증은 그대로 400 이다", async () => {
    await spec().post("/auth/apple").withJson({}).expectStatus(400);
  });

  it("카카오 가입·탈퇴는 영향 없이 동작한다", async () => {
    const session = socialLoginResultSchema.parse(
      await spec()
        .post("/auth/kakao")
        .withJson({ kakaoAccessToken: "valid-no-apple-server" })
        .expectStatus(201)
        .returns("res.body"),
    );

    await spec()
      .delete("/users/me")
      .withBearerToken(session.accessToken)
      .expectStatus(204);
  });
});
