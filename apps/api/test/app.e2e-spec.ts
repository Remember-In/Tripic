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

  it("GET /health → 200 { status: ok }", async () => {
    await spec().get("/health").expectStatus(200).expectJson({ status: "ok" });
  });
});
