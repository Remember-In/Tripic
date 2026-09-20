import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import { z } from "zod";
import { AppModule } from "@/app.module";
import {
  KAKAO_VERIFIER,
  type KakaoVerifier,
} from "@/auth/ports/kakao-verifier.port";

/**
 * KTO_SERVICE_KEY 를 비운 서버 (docs/15 §4).
 * ConfigModule 이 AppModule import 시점에 apps/api/.env 까지 읽으므로 vi.hoisted 로 먼저 지운다 —
 * 없으면 개발자가 .env 에 키를 채우는 순간 이 테스트가 실제 TourAPI 를 호출한다.
 */
vi.hoisted(() => {
  delete process.env.KTO_SERVICE_KEY;
});

const kakaoStub: KakaoVerifier = {
  async verifyAccessToken(token: string) {
    if (!token.startsWith("valid-")) {
      throw new UnauthorizedException("invalid kakao token");
    }
    return { kakaoUserId: token.slice("valid-".length) };
  },
};

describe("TourAPI 미설정 서버 (e2e)", () => {
  let app: INestApplication;
  let token: string;

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

    const body = await spec()
      .post("/auth/kakao")
      .withJson({ kakaoAccessToken: "valid-no-tourism" })
      .expectStatus(201)
      .returns("res.body");
    token = z
      .object({ accessToken: z.string().min(1) })
      .parse(body).accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it("서버는 정상 기동한다 — health probe 200", async () => {
    await spec().get("/health").expectStatus(200);
  });

  it.each([
    "/tourism/areas",
    "/tourism/search?keyword=경복궁",
    "/tourism/places?areaCode=1",
    "/tourism/places/126508",
    "/tourism/places/126508/images",
  ])("%s 는 503", async (path) => {
    await spec().get(path).withBearerToken(token).expectStatus(503);
  });

  it("요청 형식 검증은 503 보다 먼저 400 이다", async () => {
    await spec()
      .get("/tourism/places")
      .withBearerToken(token)
      .expectStatus(400);
  });

  it("인증은 여전히 먼저 걸린다 — 미설정이어도 401", async () => {
    await spec().get("/tourism/areas").expectStatus(401);
  });

  it("기록 API 는 영향 없이 동작한다", async () => {
    const body = await spec()
      .get("/records")
      .withBearerToken(token)
      .expectStatus(200)
      .returns("res.body");

    expect(z.array(z.unknown()).parse(body)).toEqual([]);
  });
});
