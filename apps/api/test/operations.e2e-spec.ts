import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import type { AppConfig, Notice, VersionInfo } from "@tripic/shared";
import { AppModule } from "@/app.module";

const SEMVER = /^\d+\.\d+\.\d+$/;

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
      const body = (await spec()
        .get("/version")
        .expectStatus(200)
        .returns("res.body")) as VersionInfo;

      expect(body.minSupportedVersion).toMatch(SEMVER);
      expect(body.latestVersion).toMatch(SEMVER);
      // 스토어 URL 미확정 — 빈 문자열이 아니라 필드 생략 (docs/13 §4)
      expect(body).not.toHaveProperty("updateUrl.android", "");
      expect(body).not.toHaveProperty("updateUrl.ios", "");
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
      const body = (await spec()
        .get("/app-config")
        .expectStatus(200)
        .returns("res.body")) as AppConfig;

      expect(body.kto.defaultRadiusM).toBeGreaterThan(0);
      expect(body.kto.maxRadiusM).toBeGreaterThanOrEqual(
        body.kto.defaultRadiusM,
      );
      expect(body.kto.maxCandidates).toBeGreaterThan(0);
      expect(typeof body.features.aiDiary).toBe("boolean");
      expect(typeof body.features.photoUpload).toBe("boolean");
    });

    it("캐시 허용 헤더를 내려준다", async () => {
      await spec()
        .get("/app-config")
        .expectStatus(200)
        .expectHeader("cache-control", "public, max-age=300");
    });
  });

  describe("GET /notices", () => {
    it("Bearer 없이 200 + 공지 배열 (publishedAt 내림차순)", async () => {
      const body = (await spec()
        .get("/notices")
        .expectStatus(200)
        .returns("res.body")) as Notice[];

      expect(Array.isArray(body)).toBe(true);
      const publishedAt = body.map((notice) => notice.publishedAt);
      expect(publishedAt).toEqual([...publishedAt].sort().reverse());
    });

    it("캐시 허용 헤더를 내려준다", async () => {
      await spec()
        .get("/notices")
        .expectStatus(200)
        .expectHeader("cache-control", "public, max-age=300");
    });
  });
});
