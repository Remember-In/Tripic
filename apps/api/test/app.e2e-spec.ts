import { afterAll, beforeAll, describe, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import { AppModule } from "@/app.module";

describe("API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);

    // getUrl() 이 IPv6 [::1] 을 반환할 수 있어 localhost 로 치환 (pactum 레퍼런스)
    const url = await app.getUrl();
    request.setBaseUrl(url.replace("[::1]", "localhost"));
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health → 200, 상태와 떠 있는 빌드를 함께 돌려준다", async () => {
    // 빌드 인자 없이 띄운 e2e 에서는 version·commit 이 null 이지만 키는 빠지지 않는다 —
    // 배포 환경에서 이 값으로 어느 빌드가 떠 있는지 확인한다
    await spec()
      .get("/health")
      .expectStatus(200)
      .expectJson({ status: "ok", version: null, commit: null });
  });

  it("Bearer 없이도 통과한다 — 플랫폼 probe 가 인증 없이 호출한다", async () => {
    // Northflank 의 liveness/readiness probe 경로다 (docs/10 §8)
    await spec().get("/health").expectStatus(200);
    await spec().get("/health").withBearerToken("garbage").expectStatus(200);
  });

  it("없는 경로는 404 로 답한다", async () => {
    await spec().get("/nope").expectStatus(404);
  });

  it("인증이 필요한 경로는 Bearer 없이 401 이다 (전역 default-deny)", async () => {
    await spec().get("/users/me").expectStatus(401);
    await spec().get("/records").expectStatus(401);
  });
});
