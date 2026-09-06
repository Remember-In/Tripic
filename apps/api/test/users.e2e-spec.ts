import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import { z } from "zod";
import { kakaoLoginResultSchema } from "@tripic/shared";
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

/**
 * 응답 검증에 **앱과 공유하는 계약 스키마를 그대로 쓴다** (@tripic/shared).
 * 테스트가 스키마를 다시 정의하면 서버가 계약을 어겨도 테스트만 통과할 수 있다.
 */
type LoginBody = z.infer<typeof kakaoLoginResultSchema>;

const login = async (kakaoToken: string): Promise<LoginBody> =>
  kakaoLoginResultSchema.parse(
    await spec()
      .post("/auth/kakao")
      .withJson({ kakaoAccessToken: kakaoToken })
      .expectStatus(201)
      .returns("res.body"),
  );

/** 회원탈퇴 — users 행 삭제 + FK cascade 일괄 파기 (docs/10 §3·§6) */
describe("Users withdrawal (e2e)", () => {
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
    await app.close();
  });

  it("Bearer 없으면 401", async () => {
    await spec().delete("/users/me").expectStatus(401);
  });

  it("탈퇴하면 204, 이후 같은 access token 으로 프로필 조회는 401", async () => {
    const session = await login("valid-withdraw-1");

    await spec()
      .delete("/users/me")
      .withBearerToken(session.accessToken)
      .expectStatus(204);

    await spec()
      .get("/users/me")
      .withBearerToken(session.accessToken)
      .expectStatus(401);
  });

  it("탈퇴하면 refresh 토큰도 cascade 로 사라져 재발급이 막힌다", async () => {
    const session = await login("valid-withdraw-2");

    await spec()
      .delete("/users/me")
      .withBearerToken(session.accessToken)
      .expectStatus(204);

    await spec()
      .post("/auth/refresh")
      .withJson({ refreshToken: session.refreshToken })
      .expectStatus(401);
  });

  it("탈퇴 후 같은 카카오 계정으로 다시 로그인하면 새 사용자로 가입된다", async () => {
    const before = await login("valid-withdraw-3");

    await spec()
      .delete("/users/me")
      .withBearerToken(before.accessToken)
      .expectStatus(204);

    const after = await login("valid-withdraw-3");
    expect(after.isNewUser).toBe(true);
    expect(after.user.id).not.toBe(before.user.id);
    expect(after.user.nickname).toBeNull();
  });

  it("탈퇴하면 그 사용자의 기록도 함께 사라진다 (cascade)", async () => {
    const session = await login("valid-withdraw-records");
    const created = await spec()
      .post("/records")
      .withBearerToken(session.accessToken)
      .withJson({ title: "탈퇴 전 기록" })
      .expectStatus(201)
      .returns("res.body");
    const recordId = z.object({ id: z.string() }).parse(created).id;

    await spec()
      .delete("/users/me")
      .withBearerToken(session.accessToken)
      .expectStatus(204);

    // 같은 카카오 계정으로 다시 가입해도 이전 기록은 보이지 않아야 한다
    const revived = await login("valid-withdraw-records");
    await spec()
      .get(`/records/${recordId}`)
      .withBearerToken(revived.accessToken)
      .expectStatus(404);
    await spec()
      .get("/records")
      .withBearerToken(revived.accessToken)
      .expectStatus(200)
      .expectJson([]);
  });

  it("탈퇴는 본인 토큰으로만 된다 — 위조 토큰은 401", async () => {
    await spec().delete("/users/me").withBearerToken("a.b.c").expectStatus(401);
    await spec()
      .delete("/users/me")
      .withHeaders("authorization", "Token abc")
      .expectStatus(401);
  });

  it("한 사용자가 탈퇴해도 다른 사용자는 그대로다", async () => {
    const leaving = await login("valid-withdraw-isolation-1");
    const staying = await login("valid-withdraw-isolation-2");

    await spec()
      .delete("/users/me")
      .withBearerToken(leaving.accessToken)
      .expectStatus(204);

    await spec()
      .get("/users/me")
      .withBearerToken(staying.accessToken)
      .expectStatus(200);
    await spec()
      .post("/auth/refresh")
      .withJson({ refreshToken: staying.refreshToken })
      .expectStatus(200);
  });

  it("탈퇴 후에는 닉네임 변경도 막힌다", async () => {
    const session = await login("valid-withdraw-nickname");
    await spec()
      .delete("/users/me")
      .withBearerToken(session.accessToken)
      .expectStatus(204);

    await spec()
      .patch("/users/me")
      .withBearerToken(session.accessToken)
      .withJson({ nickname: "유령" })
      .expectStatus(401);
  });

  it("탈퇴한 사용자의 남은 access token 으로 다시 탈퇴를 시도하면 401", async () => {
    const session = await login("valid-withdraw-4");

    await spec()
      .delete("/users/me")
      .withBearerToken(session.accessToken)
      .expectStatus(204);

    await spec()
      .delete("/users/me")
      .withBearerToken(session.accessToken)
      .expectStatus(401);
  });
});
