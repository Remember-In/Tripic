import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import { z } from "zod";
import {
  mapProgressResponseSchema,
  recordPlaceSchema,
  type KtoArea,
  type KtoImage,
  type KtoListItem,
  type KtoPlaceDetail,
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

/** 마법 문자열 규약: contentId 앞 한 자리가 areaCode, "9" 로 시작하면 KTO 에 없는 관광지 */
const ktoStub: KtoClient = {
  async searchByKeyword(): Promise<readonly KtoListItem[]> {
    return [];
  },
  async findByArea(_filter: KtoAreaFilter): Promise<readonly KtoListItem[]> {
    return [];
  },
  async findDetail(contentId: string): Promise<KtoPlaceDetail | null> {
    if (contentId.startsWith("9")) return null;
    return {
      address: "서울 종로구",
      areaCode: contentId.slice(0, 1),
      categoryCode: "A02",
      contentId,
      sigunguCode: "23",
      title: `관광지 ${contentId}`,
    };
  },
  async findImages(): Promise<readonly KtoImage[]> {
    return [];
  },
  async listAreas(): Promise<readonly KtoArea[]> {
    return [];
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

const createRecord = async (token: string, title: string): Promise<string> => {
  const body = await spec()
    .post("/records")
    .withBearerToken(token)
    .withJson({ title })
    .expectStatus(201)
    .returns("res.body");
  return z.object({ id: z.string().min(1) }).parse(body).id;
};

describe("방문 관광지·지도 진행률 (e2e)", () => {
  let app: INestApplication;
  let owner: string;
  let stranger: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KAKAO_VERIFIER)
      .useValue(kakaoStub)
      .overrideProvider(KTO_CLIENT)
      .useValue(ktoStub)
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    request.setBaseUrl((await app.getUrl()).replace("[::1]", "localhost"));
    owner = await login("valid-places-owner");
    stranger = await login("valid-places-stranger");
  });

  afterAll(async () => {
    await app?.close();
  });

  const addPlace = (
    token: string,
    recordId: string,
    contentId: string,
    visitedAt: string,
  ) =>
    spec()
      .post(`/records/${recordId}/places`)
      .withBearerToken(token)
      .withJson({ contentId, visitedAt });

  describe("인증", () => {
    it("인증 없이는 모든 라우트가 401", async () => {
      await spec().post("/records/x/places").expectStatus(401);
      await spec().get("/records/x/places").expectStatus(401);
      await spec().patch("/records/x/places/y").expectStatus(401);
      await spec().delete("/records/x/places/y").expectStatus(401);
      await spec().get("/map/progress").expectStatus(401);
    });
  });

  describe("생성 → 조회 → 수정 → 삭제", () => {
    it("정상 흐름이 동작하고 지역코드는 서버가 채운다", async () => {
      const recordId = await createRecord(owner, "방문 관광지 흐름");

      const created = recordPlaceSchema.parse(
        await addPlace(owner, recordId, "126508", "2026-09-20")
          .expectStatus(201)
          .returns("res.body"),
      );
      expect(created).toMatchObject({
        contentId: "126508",
        areaCode: "1",
        sigunguCode: "23",
        visitedAt: "2026-09-20",
      });

      const listed = z
        .array(recordPlaceSchema)
        .parse(
          await spec()
            .get(`/records/${recordId}/places`)
            .withBearerToken(owner)
            .expectStatus(200)
            .returns("res.body"),
        );
      expect(listed).toHaveLength(1);

      const updated = recordPlaceSchema.parse(
        await spec()
          .patch(`/records/${recordId}/places/${created.id}`)
          .withBearerToken(owner)
          .withJson({ visitedAt: "2026-09-22" })
          .expectStatus(200)
          .returns("res.body"),
      );
      expect(updated.visitedAt).toBe("2026-09-22");

      await spec()
        .delete(`/records/${recordId}/places/${created.id}`)
        .withBearerToken(owner)
        .expectStatus(204);

      const after = z
        .array(recordPlaceSchema)
        .parse(
          await spec()
            .get(`/records/${recordId}/places`)
            .withBearerToken(owner)
            .expectStatus(200)
            .returns("res.body"),
        );
      expect(after).toHaveLength(0);
    });

    it("contentId 를 바꾸면 지역코드가 함께 교체된다", async () => {
      const recordId = await createRecord(owner, "관광지 교체");
      const created = recordPlaceSchema.parse(
        await addPlace(owner, recordId, "126508", "2026-09-20")
          .expectStatus(201)
          .returns("res.body"),
      );

      const updated = recordPlaceSchema.parse(
        await spec()
          .patch(`/records/${recordId}/places/${created.id}`)
          .withBearerToken(owner)
          .withJson({ contentId: "626508" })
          .expectStatus(200)
          .returns("res.body"),
      );

      expect(updated.areaCode).toBe("6");
    });
  });

  describe("검증과 소유권", () => {
    it("KTO 에 없는 contentId 는 404", async () => {
      const recordId = await createRecord(owner, "없는 관광지");

      await addPlace(owner, recordId, "999999", "2026-09-20").expectStatus(404);
    });

    it("타인의 기록은 404 — 존재를 숨긴다", async () => {
      const recordId = await createRecord(owner, "남의 기록");

      await addPlace(stranger, recordId, "126508", "2026-09-20").expectStatus(
        404,
      );
      await spec()
        .get(`/records/${recordId}/places`)
        .withBearerToken(stranger)
        .expectStatus(404);
    });

    it("같은 관광지·같은 날 중복은 409", async () => {
      const recordId = await createRecord(owner, "중복 방문");
      await addPlace(owner, recordId, "126508", "2026-09-20").expectStatus(201);

      await addPlace(owner, recordId, "126508", "2026-09-20").expectStatus(409);
    });

    it("동시에 같은 값을 보내면 하나만 성공한다", async () => {
      const recordId = await createRecord(owner, "동시 생성");

      const results = await Promise.allSettled([
        addPlace(owner, recordId, "126508", "2026-09-25").toss(),
        addPlace(owner, recordId, "126508", "2026-09-25").toss(),
      ]);
      const created = z
        .array(recordPlaceSchema)
        .parse(
          await spec()
            .get(`/records/${recordId}/places`)
            .withBearerToken(owner)
            .expectStatus(200)
            .returns("res.body"),
        );

      expect(results).toHaveLength(2);
      expect(created).toHaveLength(1);
    });

    /** 좌표가 서버에 닿는 것 자체를 막는다 (docs/16 §4.2) */
    it.each([
      ["latitude", { latitude: 37.5 }],
      ["longitude", { longitude: 127.0 }],
      ["gps", { gps: { latitude: 37.5 } }],
      ["exif", { exif: { GPSLatitude: 37.5 } }],
      ["areaCode", { areaCode: "9" }],
    ])("%s 를 함께 보내면 400", async (_name, extra) => {
      const recordId = await createRecord(owner, `거부 ${_name}`);

      await spec()
        .post(`/records/${recordId}/places`)
        .withBearerToken(owner)
        .withJson({ contentId: "126508", visitedAt: "2026-09-20", ...extra })
        .expectStatus(400);
    });

    it("방문일에 시각을 붙이면 400", async () => {
      const recordId = await createRecord(owner, "시각 거부");

      await addPlace(
        owner,
        recordId,
        "126508",
        "2026-09-20T00:00:00.000Z",
      ).expectStatus(400);
    });

    it("빈 PATCH 본문은 400", async () => {
      const recordId = await createRecord(owner, "빈 수정");
      const created = recordPlaceSchema.parse(
        await addPlace(owner, recordId, "126508", "2026-09-20")
          .expectStatus(201)
          .returns("res.body"),
      );

      await spec()
        .patch(`/records/${recordId}/places/${created.id}`)
        .withBearerToken(owner)
        .withJson({})
        .expectStatus(400);
    });
  });

  describe("GET /map/progress", () => {
    it("장소를 추가하면 지역 집계가 늘고, 지우면 원복된다", async () => {
      const token = await login("valid-progress-user");
      const recordId = await createRecord(token, "진행률");

      const before = mapProgressResponseSchema.parse(
        await spec()
          .get("/map/progress")
          .withBearerToken(token)
          .expectStatus(200)
          .returns("res.body"),
      );
      expect(before.visitedAreaCount).toBe(0);
      expect(before.totalAreaCount).toBe(17);

      const created = recordPlaceSchema.parse(
        await addPlace(token, recordId, "126508", "2026-09-20")
          .expectStatus(201)
          .returns("res.body"),
      );
      await addPlace(token, recordId, "626508", "2026-08-12").expectStatus(201);

      const after = mapProgressResponseSchema.parse(
        await spec()
          .get("/map/progress")
          .withBearerToken(token)
          .expectStatus(200)
          .returns("res.body"),
      );
      expect(after.visitedAreaCount).toBe(2);
      expect(after.recordedPlaceCount).toBe(2);
      expect(after.regions.map((region) => region.areaCode)).toEqual([
        "1",
        "6",
      ]);

      await spec()
        .delete(`/records/${recordId}/places/${created.id}`)
        .withBearerToken(token)
        .expectStatus(204);

      const removed = mapProgressResponseSchema.parse(
        await spec()
          .get("/map/progress")
          .withBearerToken(token)
          .expectStatus(200)
          .returns("res.body"),
      );
      expect(removed.visitedAreaCount).toBe(1);
      expect(removed.regions.map((region) => region.areaCode)).toEqual(["6"]);
    });

    it("기록을 지우면 그 기록의 장소도 집계에서 사라진다", async () => {
      const token = await login("valid-progress-cascade");
      const recordId = await createRecord(token, "기록 삭제 원복");
      await addPlace(token, recordId, "126508", "2026-09-20").expectStatus(201);

      await spec()
        .delete(`/records/${recordId}`)
        .withBearerToken(token)
        .expectStatus(204);

      const after = mapProgressResponseSchema.parse(
        await spec()
          .get("/map/progress")
          .withBearerToken(token)
          .expectStatus(200)
          .returns("res.body"),
      );
      expect(after.visitedAreaCount).toBe(0);
    });

    it("사용자별로 격리된다", async () => {
      const mine = await login("valid-progress-isolated");
      const recordId = await createRecord(mine, "격리");
      await addPlace(mine, recordId, "126508", "2026-09-20").expectStatus(201);

      const others = mapProgressResponseSchema.parse(
        await spec()
          .get("/map/progress")
          .withBearerToken(stranger)
          .expectStatus(200)
          .returns("res.body"),
      );

      expect(others.recordedPlaceCount).toBe(0);
    });
  });
});
