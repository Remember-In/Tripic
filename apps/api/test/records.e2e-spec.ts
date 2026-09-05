import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import sharp from "sharp";
import { z } from "zod";
import { AppModule } from "@/app.module";
import {
  KAKAO_VERIFIER,
  type KakaoVerifier,
} from "@/auth/ports/kakao-verifier.port";

/** 카카오 API stub — "valid-<id>" 형태의 토큰만 통과시킨다 (port 교체, CLAUDE.md) */
const kakaoStub: KakaoVerifier = {
  async verifyAccessToken(token: string) {
    if (!token.startsWith("valid-")) {
      throw new UnauthorizedException("invalid kakao token");
    }
    return { kakaoUserId: token.slice("valid-".length) };
  },
};

// 응답은 타입 단언 대신 스키마로 검증한다 — 계약이 어긋나면 여기서 바로 실패한다
const summarySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  theme: z.string().nullable(),
  style: z.string().nullable(),
  hashtags: z.array(z.string()),
  entryCount: z.number().int(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const detailSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  days: z.array(
    z.object({
      date: z.string(),
      entry: z
        .object({
          content: z.string(),
          source: z.enum(["USER", "AI"]),
          createdAt: z.string(),
          updatedAt: z.string(),
        })
        .nullable(),
      photos: z.array(z.unknown()),
    }),
  ),
});

const photoSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
});

type Summary = z.infer<typeof summarySchema>;

const login = async (kakaoToken: string): Promise<string> => {
  const body = await spec()
    .post("/auth/kakao")
    .withJson({ kakaoAccessToken: kakaoToken })
    .expectStatus(201)
    .returns("res.body");
  return z.object({ accessToken: z.string().min(1) }).parse(body).accessToken;
};

describe("Records (e2e)", () => {
  let app: INestApplication;
  let owner: string;
  let stranger: string;

  const createRecord = async (
    token: string,
    title = "경주 여행",
  ): Promise<Summary> =>
    summarySchema.parse(
      await spec()
        .post("/records")
        .withBearerToken(token)
        .withJson({ title, theme: "NATURE_SCENERY", hashtags: ["#경주"] })
        .expectStatus(201)
        .returns("res.body"),
    );

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

    owner = await login("valid-records-owner");
    stranger = await login("valid-records-stranger");
  });

  afterAll(async () => {
    await app.close();
  });

  it("Bearer 없으면 401", async () => {
    await spec().get("/records").expectStatus(401);
  });

  it("생성 → 목록에 보이고, 날짜 범위는 비어 있다", async () => {
    const created = await createRecord(owner, "생성 확인");

    expect(created.theme).toBe("NATURE_SCENERY");
    expect(created.entryCount).toBe(0);
    expect(created.startDate).toBeNull();

    const list = z
      .array(summarySchema)
      .parse(
        await spec()
          .get("/records")
          .withBearerToken(owner)
          .expectStatus(200)
          .returns("res.body"),
      );
    expect(list.map((row) => row.id)).toContain(created.id);
  });

  it("본문 검증 실패는 400", async () => {
    await spec()
      .post("/records")
      .withBearerToken(owner)
      .withJson({ title: "" })
      .expectStatus(400);
  });

  it("일기를 쓰면 상세에 날짜 오름차순으로 담기고 요약 날짜 범위가 갱신된다", async () => {
    const created = await createRecord(owner, "일기 확인");

    await spec()
      .put(`/records/${created.id}/days/2026-08-17/entry`)
      .withBearerToken(owner)
      .withJson({ content: "셋째 날", source: "USER" })
      .expectStatus(200);
    await spec()
      .put(`/records/${created.id}/days/2026-08-15/entry`)
      .withBearerToken(owner)
      .withJson({ content: "첫째 날", source: "AI" })
      .expectStatus(200);

    const detail = detailSchema.parse(
      await spec()
        .get(`/records/${created.id}`)
        .withBearerToken(owner)
        .expectStatus(200)
        .returns("res.body"),
    );
    expect(detail.days.map((day) => day.date)).toEqual([
      "2026-08-15",
      "2026-08-17",
    ]);
    expect(detail.days[0].entry?.source).toBe("AI");

    const list = z
      .array(summarySchema)
      .parse(
        await spec()
          .get("/records")
          .withBearerToken(owner)
          .expectStatus(200)
          .returns("res.body"),
      );
    const summary = list.find((row) => row.id === created.id);
    expect(summary?.entryCount).toBe(2);
    expect(summary?.startDate).toBe("2026-08-15");
    expect(summary?.endDate).toBe("2026-08-17");
  });

  it("같은 날짜에 다시 쓰면 교체된다 (하루 1편)", async () => {
    const created = await createRecord(owner, "upsert 확인");
    const day = `/records/${created.id}/days/2026-08-15/entry`;

    await spec()
      .put(day)
      .withBearerToken(owner)
      .withJson({ content: "처음", source: "AI" })
      .expectStatus(200);
    await spec()
      .put(day)
      .withBearerToken(owner)
      .withJson({ content: "고쳐 씀", source: "USER" })
      .expectStatus(200);

    const detail = detailSchema.parse(
      await spec()
        .get(`/records/${created.id}`)
        .withBearerToken(owner)
        .expectStatus(200)
        .returns("res.body"),
    );
    expect(detail.days).toHaveLength(1);
    expect(detail.days[0].entry?.content).toBe("고쳐 씀");
  });

  it("잘못된 날짜 형식은 400", async () => {
    const created = await createRecord(owner, "날짜 검증");

    await spec()
      .put(`/records/${created.id}/days/2026-02-30/entry`)
      .withBearerToken(owner)
      .withJson({ content: "없는 날", source: "USER" })
      .expectStatus(400);
  });

  it("부분 수정 — 보낸 필드만 바뀌고 null 은 해제한다", async () => {
    const created = await createRecord(owner, "수정 전");

    const updated = summarySchema.parse(
      await spec()
        .patch(`/records/${created.id}`)
        .withBearerToken(owner)
        .withJson({ title: "수정 후", theme: null })
        .expectStatus(200)
        .returns("res.body"),
    );

    expect(updated.title).toBe("수정 후");
    expect(updated.theme).toBeNull();
    expect(updated.hashtags).toEqual(["#경주"]);
  });

  it("타인의 기록은 조회·수정·삭제 모두 404 로 숨긴다", async () => {
    const created = await createRecord(owner, "소유권 확인");

    await spec()
      .get(`/records/${created.id}`)
      .withBearerToken(stranger)
      .expectStatus(404);
    await spec()
      .patch(`/records/${created.id}`)
      .withBearerToken(stranger)
      .withJson({ title: "가로채기" })
      .expectStatus(404);
    await spec()
      .delete(`/records/${created.id}`)
      .withBearerToken(stranger)
      .expectStatus(404);

    // 실제로 지워지지 않았는지 확인
    await spec()
      .get(`/records/${created.id}`)
      .withBearerToken(owner)
      .expectStatus(200);
  });

  it("기록을 지우면 일기도 함께 사라진다", async () => {
    const created = await createRecord(owner, "삭제 확인");
    await spec()
      .put(`/records/${created.id}/days/2026-08-15/entry`)
      .withBearerToken(owner)
      .withJson({ content: "첫째 날", source: "USER" })
      .expectStatus(200);

    await spec()
      .delete(`/records/${created.id}`)
      .withBearerToken(owner)
      .expectStatus(204);

    await spec()
      .get(`/records/${created.id}`)
      .withBearerToken(owner)
      .expectStatus(404);
  });

  it("일기만 지우면 기록은 남는다", async () => {
    const created = await createRecord(owner, "일기 삭제");
    const day = `/records/${created.id}/days/2026-08-15/entry`;
    await spec()
      .put(day)
      .withBearerToken(owner)
      .withJson({ content: "첫째 날", source: "USER" })
      .expectStatus(200);

    await spec().delete(day).withBearerToken(owner).expectStatus(204);
    await spec().delete(day).withBearerToken(owner).expectStatus(404);

    const detail = detailSchema.parse(
      await spec()
        .get(`/records/${created.id}`)
        .withBearerToken(owner)
        .expectStatus(200)
        .returns("res.body"),
    );
    expect(detail.days).toEqual([]);
  });

  describe("사진", () => {
    /** 메타데이터 없는 사본 — 앱이 재인코딩해 올리는 것과 같은 형태 */
    const cleanJpeg = (): Promise<Buffer> =>
      sharp({
        create: {
          width: 40,
          height: 30,
          channels: 3,
          background: { r: 10, g: 120, b: 200 },
        },
      })
        .jpeg()
        .toBuffer();

    it("업로드하면 상세의 해당 일차에 붙고 바이너리로 받아진다", async () => {
      const created = await createRecord(owner, "사진 업로드");
      const image = await cleanJpeg();

      const uploaded = photoSchema.parse(
        await spec()
          .post(`/records/${created.id}/days/2026-08-15/photos`)
          .withBearerToken(owner)
          .withMultiPartFormData("photo", image, {
            filename: "trip.jpg",
            contentType: "image/jpeg",
          })
          .expectStatus(201)
          .returns("res.body"),
      );
      expect(uploaded.url).toBe(
        `/records/${created.id}/days/2026-08-15/photos/${uploaded.id}`,
      );

      const detail = detailSchema.parse(
        await spec()
          .get(`/records/${created.id}`)
          .withBearerToken(owner)
          .expectStatus(200)
          .returns("res.body"),
      );
      expect(detail.days).toHaveLength(1);
      expect(detail.days[0].date).toBe("2026-08-15");
      // 사진만 있고 일기는 없는 일차도 성립한다
      expect(detail.days[0].entry).toBeNull();
      expect(detail.days[0].photos).toHaveLength(1);

      await spec()
        .get(uploaded.url)
        .withBearerToken(owner)
        .expectStatus(200)
        .expectHeader("content-type", "image/jpeg")
        .expectHeader("x-content-type-options", "nosniff");
    });

    it("이미지가 아니면 400", async () => {
      const created = await createRecord(owner, "사진 검증");

      await spec()
        .post(`/records/${created.id}/days/2026-08-15/photos`)
        .withBearerToken(owner)
        .withMultiPartFormData("photo", Buffer.from("그냥 텍스트"), {
          filename: "a.jpg",
          contentType: "image/jpeg",
        })
        .expectStatus(400);
    });

    it("EXIF 가 남아 있으면 400 으로 거부한다", async () => {
      const created = await createRecord(owner, "EXIF 거부");
      // 위치 메타데이터가 남은 사본을 흉내 낸다
      const withExif = await sharp(await cleanJpeg())
        .withExif({ IFD0: { Copyright: "tripic" } })
        .toBuffer();

      await spec()
        .post(`/records/${created.id}/days/2026-08-15/photos`)
        .withBearerToken(owner)
        .withMultiPartFormData("photo", withExif, {
          filename: "exif.jpg",
          contentType: "image/jpeg",
        })
        .expectStatus(400);
    });

    it("타인은 남의 사진을 받아갈 수 없다 (404)", async () => {
      const created = await createRecord(owner, "사진 소유권");
      const uploaded = photoSchema.parse(
        await spec()
          .post(`/records/${created.id}/days/2026-08-15/photos`)
          .withBearerToken(owner)
          .withMultiPartFormData("photo", await cleanJpeg(), {
            filename: "trip.jpg",
            contentType: "image/jpeg",
          })
          .expectStatus(201)
          .returns("res.body"),
      );

      await spec()
        .get(uploaded.url)
        .withBearerToken(stranger)
        .expectStatus(404);
      await spec()
        .delete(uploaded.url)
        .withBearerToken(stranger)
        .expectStatus(404);
    });

    it("사진을 지우면 상세에서 사라진다", async () => {
      const created = await createRecord(owner, "사진 삭제");
      const uploaded = photoSchema.parse(
        await spec()
          .post(`/records/${created.id}/days/2026-08-15/photos`)
          .withBearerToken(owner)
          .withMultiPartFormData("photo", await cleanJpeg(), {
            filename: "trip.jpg",
            contentType: "image/jpeg",
          })
          .expectStatus(201)
          .returns("res.body"),
      );

      await spec()
        .delete(uploaded.url)
        .withBearerToken(owner)
        .expectStatus(204);
      await spec()
        .delete(uploaded.url)
        .withBearerToken(owner)
        .expectStatus(404);

      const detail = detailSchema.parse(
        await spec()
          .get(`/records/${created.id}`)
          .withBearerToken(owner)
          .expectStatus(200)
          .returns("res.body"),
      );
      expect(detail.days).toEqual([]);
    });
  });

  it("전체 초기화는 내 기록만 지운다", async () => {
    await createRecord(owner, "초기화 대상");
    const others = await createRecord(stranger, "남의 기록");

    await spec().delete("/records").withBearerToken(owner).expectStatus(204);

    const mine = z
      .array(summarySchema)
      .parse(
        await spec()
          .get("/records")
          .withBearerToken(owner)
          .expectStatus(200)
          .returns("res.body"),
      );
    expect(mine).toEqual([]);

    await spec()
      .get(`/records/${others.id}`)
      .withBearerToken(stranger)
      .expectStatus(200);
  });
});
