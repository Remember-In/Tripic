import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import {
  BadGatewayException,
  UnauthorizedException,
  type INestApplication,
} from "@nestjs/common";
import { request, spec } from "pactum";
import { z } from "zod";
import {
  ktoAreaSchema,
  ktoImageSchema,
  ktoListItemSchema,
  ktoPlaceDetailSchema,
} from "@tripic/shared";
import { AppModule } from "@/app.module";
import {
  KAKAO_VERIFIER,
  type KakaoVerifier,
} from "@/auth/ports/kakao-verifier.port";
import {
  KTO_CLIENT,
  type KtoAreaFilter,
  type KtoClient,
} from "@/tourism/ports/kto-client.port";

/** KTO_SERVICE_KEY 가 있어야 실제 adapter 대신 stub 으로 갈아끼운 상태를 검증할 수 있다 */
vi.hoisted(() => {
  process.env.KTO_SERVICE_KEY = "e2e-service-key";
});

const kakaoStub: KakaoVerifier = {
  async verifyAccessToken(token: string) {
    if (!token.startsWith("valid-")) {
      throw new UnauthorizedException("invalid kakao token");
    }
    return { kakaoUserId: token.slice("valid-".length) };
  },
};

const place = (contentId: string, areaCode = "1") => ({
  address: "서울 종로구 세종대로 175",
  areaCode,
  contentId,
  title: `관광지 ${contentId}`,
});

/** 마법 문자열 규약: keyword "boom" 은 상류 장애, contentId "999" 는 결과 없음 */
const ktoStub: KtoClient = {
  async searchByKeyword(keyword: string, limit: number) {
    if (keyword === "boom") {
      throw new BadGatewayException("tourism upstream error: 9999");
    }
    return [place("1"), place("2")].slice(0, limit);
  },
  async findByArea(filter: KtoAreaFilter, limit: number) {
    return [place("3", filter.areaCode)].slice(0, limit);
  },
  async findDetail(contentId: string) {
    return contentId === "999"
      ? null
      : { ...place(contentId), overview: "소개" };
  },
  async findImages(contentId: string) {
    return [{ contentId, originalUrl: "https://img.example/a.jpg" }];
  },
  async listAreas() {
    return [
      { code: "1", name: "서울" },
      { code: "2", name: "인천" },
    ];
  },
};

const login = async (token: string): Promise<string> => {
  const body = await spec()
    .post("/auth/kakao")
    .withJson({ kakaoAccessToken: token })
    .expectStatus(201)
    .returns("res.body");
  return z.object({ accessToken: z.string().min(1) }).parse(body).accessToken;
};

describe("Tourism 프록시 (e2e)", () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KAKAO_VERIFIER)
      .useValue(kakaoStub)
      .overrideProvider(KTO_CLIENT)
      .useValue(ktoStub)
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    const url = await app.getUrl();
    request.setBaseUrl(url.replace("[::1]", "localhost"));
    token = await login("valid-tourism-1");
  });

  afterAll(async () => {
    await app?.close();
  });

  /** 서비스키는 일일 쿼터가 있는 자원이라 익명 호출에 열지 않는다 */
  describe("인증", () => {
    it.each([
      "/tourism/areas",
      "/tourism/search?keyword=경복궁",
      "/tourism/places?areaCode=1",
      "/tourism/places/126508",
      "/tourism/places/126508/images",
    ])("인증 없이 %s 를 호출하면 401", async (path) => {
      await spec().get(path).expectStatus(401);
    });
  });

  describe("GET /tourism/search", () => {
    it("키워드로 검색한다", async () => {
      const body = await spec()
        .get("/tourism/search")
        .withQueryParams({ keyword: "경복궁" })
        .withBearerToken(token)
        .expectStatus(200)
        .returns("res.body");

      const places = z.array(ktoListItemSchema).parse(body);
      expect(places).toHaveLength(2);
    });

    it("limit 으로 개수를 줄인다", async () => {
      const body = await spec()
        .get("/tourism/search")
        .withQueryParams({ keyword: "경복궁", limit: 1 })
        .withBearerToken(token)
        .expectStatus(200)
        .returns("res.body");

      expect(z.array(ktoListItemSchema).parse(body)).toHaveLength(1);
    });

    // pactum 의 withQueryParams 는 빈 객체를 거부해 쿼리 없이 직접 호출한다
    it("키워드가 없으면 400", async () => {
      await spec()
        .get("/tourism/search")
        .withBearerToken(token)
        .expectStatus(400);
    });

    it.each([
      ["공백뿐인 키워드", { keyword: "   " }],
      ["limit 상한 초과", { keyword: "경복궁", limit: 51 }],
    ])("%s 이면 400", async (_name, query) => {
      await spec()
        .get("/tourism/search")
        .withQueryParams(query)
        .withBearerToken(token)
        .expectStatus(400);
    });

    it("상류 장애는 502", async () => {
      await spec()
        .get("/tourism/search")
        .withQueryParams({ keyword: "boom" })
        .withBearerToken(token)
        .expectStatus(502);
    });
  });

  describe("GET /tourism/places", () => {
    it("지역 코드로 검색한다", async () => {
      const body = await spec()
        .get("/tourism/places")
        .withQueryParams({ areaCode: "1", sigunguCode: "23" })
        .withBearerToken(token)
        .expectStatus(200)
        .returns("res.body");

      expect(z.array(ktoListItemSchema).parse(body)[0]?.areaCode).toBe("1");
    });

    it("시군구 없이 시·도만으로도 검색한다", async () => {
      const body = await spec()
        .get("/tourism/places")
        .withQueryParams({ areaCode: "1" })
        .withBearerToken(token)
        .expectStatus(200)
        .returns("res.body");

      expect(z.array(ktoListItemSchema).parse(body)).toHaveLength(1);
    });

    // pactum 의 withQueryParams 는 빈 객체를 거부해 쿼리 없이 직접 호출한다
    it("지역 코드가 없으면 400 — 전체 조회는 제공하지 않는다", async () => {
      await spec()
        .get("/tourism/places")
        .withBearerToken(token)
        .expectStatus(400);
    });

    it.each([
      ["지역 없이 시군구만", { sigunguCode: "23" }],
      ["limit 상한 초과", { areaCode: "1", limit: 51 }],
    ])("%s 이면 400", async (_name, query) => {
      await spec()
        .get("/tourism/places")
        .withQueryParams(query)
        .withBearerToken(token)
        .expectStatus(400);
    });
  });

  describe("GET /tourism/places/:contentId", () => {
    it("상세를 돌려준다", async () => {
      const body = await spec()
        .get("/tourism/places/126508")
        .withBearerToken(token)
        .expectStatus(200)
        .returns("res.body");

      expect(ktoPlaceDetailSchema.parse(body).overview).toBe("소개");
    });

    it("결과가 없으면 404", async () => {
      await spec()
        .get("/tourism/places/999")
        .withBearerToken(token)
        .expectStatus(404);
    });

    it("숫자가 아닌 contentId 는 400", async () => {
      await spec()
        .get("/tourism/places/not-a-number")
        .withBearerToken(token)
        .expectStatus(400);
    });

    it("이미지를 돌려준다", async () => {
      const body = await spec()
        .get("/tourism/places/126508/images")
        .withBearerToken(token)
        .expectStatus(200)
        .returns("res.body");

      expect(z.array(ktoImageSchema).parse(body)).toHaveLength(1);
    });
  });

  describe("GET /tourism/areas", () => {
    it("지역 목록을 돌려준다", async () => {
      const body = await spec()
        .get("/tourism/areas")
        .withBearerToken(token)
        .expectStatus(200)
        .returns("res.body");

      expect(z.array(ktoAreaSchema).parse(body)).toHaveLength(2);
    });
  });
});
