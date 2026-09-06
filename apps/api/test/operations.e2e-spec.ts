import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import { z } from "zod";
import { AppModule } from "@/app.module";

const SEMVER = /^\d+\.\d+\.\d+$/;

// 응답은 타입 단언 대신 스키마로 검증한다 — 계약이 어긋나면 여기서 바로 실패한다
const versionSchema = z.object({
  minSupportedVersion: z.string().regex(SEMVER),
  latestVersion: z.string().regex(SEMVER),
  updateUrl: z
    .object({ android: z.string().optional(), ios: z.string().optional() })
    .optional(),
});

const appConfigSchema = z.object({
  kto: z.object({
    defaultRadiusM: z.number().int().positive(),
    maxRadiusM: z.number().int().positive(),
    maxCandidates: z.number().int().positive(),
  }),
  features: z.object({ aiDiary: z.boolean(), photoUpload: z.boolean() }),
});

const noticesSchema = z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    body: z.string(),
    publishedAt: z.string().min(1),
  }),
);

/** 비위치성 운영 API 3종 (docs/13-operations-api-design.md) — 전부 공개·캐시 허용 */
describe("Operations API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    const url = await app.getUrl();
    request.setBaseUrl(url.replace("[::1]", "localhost"));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /version", () => {
    it("Bearer 없이 200 + semver 두 개", async () => {
      const body = versionSchema.parse(
        await spec().get("/version").expectStatus(200).returns("res.body"),
      );

      expect(body.minSupportedVersion).toMatch(SEMVER);
      expect(body.latestVersion).toMatch(SEMVER);
    });

    it("스토어 URL 이 미확정이면 빈 문자열이 아니라 필드를 생략한다 (docs/13 §4)", async () => {
      const body = versionSchema.parse(
        await spec().get("/version").expectStatus(200).returns("res.body"),
      );

      // 빈 문자열을 내려보내면 앱이 유효한 링크로 오인해 빈 화면을 연다
      expect(body.updateUrl?.android).not.toBe("");
      expect(body.updateUrl?.ios).not.toBe("");
    });

    it("최소 지원 버전은 최신 버전보다 높지 않다", async () => {
      const body = versionSchema.parse(
        await spec().get("/version").expectStatus(200).returns("res.body"),
      );
      const parts = (value: string) => value.split(".").map(Number);
      const [min, latest] = [
        parts(body.minSupportedVersion),
        parts(body.latestVersion),
      ];

      // 뒤집히면 최신 버전을 쓰는 사용자에게도 강제 업데이트가 걸린다
      expect(min[0] * 1e6 + min[1] * 1e3 + min[2]).toBeLessThanOrEqual(
        latest[0] * 1e6 + latest[1] * 1e3 + latest[2],
      );
    });

    it("캐시 허용 헤더를 내려준다", async () => {
      await spec()
        .get("/version")
        .expectStatus(200)
        .expectHeader("cache-control", "public, max-age=300");
    });
  });

  describe("GET /app-config", () => {
    it("Bearer 없이 200 + 후보 조회 기준·기능 플래그", async () => {
      const body = appConfigSchema.parse(
        await spec().get("/app-config").expectStatus(200).returns("res.body"),
      );

      expect(body.kto.defaultRadiusM).toBeGreaterThan(0);
      expect(body.kto.maxCandidates).toBeGreaterThan(0);
    });

    it("확장 반경은 기본 반경 이상이다", async () => {
      const body = appConfigSchema.parse(
        await spec().get("/app-config").expectStatus(200).returns("res.body"),
      );

      // 뒤집히면 후보가 없을 때 넓히는 동작이 오히려 범위를 좁힌다
      expect(body.kto.maxRadiusM).toBeGreaterThanOrEqual(
        body.kto.defaultRadiusM,
      );
    });

    it("AI 일기는 꺼져 있고 사진 업로드는 켜져 있다 (현재 서버가 가진 기능)", async () => {
      const body = appConfigSchema.parse(
        await spec().get("/app-config").expectStatus(200).returns("res.body"),
      );

      expect(body.features).toEqual({ aiDiary: false, photoUpload: true });
    });

    it("계약에 없는 키를 덧붙이지 않는다", async () => {
      const body = await spec()
        .get("/app-config")
        .expectStatus(200)
        .returns("res.body");

      expect(appConfigSchema.strict().safeParse(body).success).toBe(true);
    });

    it("캐시 허용 헤더를 내려준다", async () => {
      await spec()
        .get("/app-config")
        .expectStatus(200)
        .expectHeader("cache-control", "public, max-age=300");
    });
  });

  describe("GET /notices", () => {
    it("Bearer 없이 200 + 공지 배열", async () => {
      const body = noticesSchema.parse(
        await spec().get("/notices").expectStatus(200).returns("res.body"),
      );

      expect(Array.isArray(body)).toBe(true);
    });

    it("publishedAt 내림차순이다 (앱이 그대로 그린다)", async () => {
      const body = noticesSchema.parse(
        await spec().get("/notices").expectStatus(200).returns("res.body"),
      );
      const publishedAt = body.map((notice) => notice.publishedAt);

      expect(publishedAt).toEqual([...publishedAt].sort().reverse());
    });

    it("id 가 중복되지 않는다 (앱의 목록 key)", async () => {
      const body = noticesSchema.parse(
        await spec().get("/notices").expectStatus(200).returns("res.body"),
      );
      const ids = body.map((notice) => notice.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it("캐시 허용 헤더를 내려준다", async () => {
      await spec()
        .get("/notices")
        .expectStatus(200)
        .expectHeader("cache-control", "public, max-age=300");
    });
  });

  describe("공개 라우트 규약", () => {
    it("세 엔드포인트 모두 잘못된 Bearer 를 보내도 200 이다 (@Public)", async () => {
      for (const path of ["/version", "/app-config", "/notices"]) {
        await spec().get(path).withBearerToken("garbage").expectStatus(200);
      }
    });

    it("없는 운영 경로는 404 다", async () => {
      await spec().get("/app-configs").expectStatus(404);
    });
  });
});
