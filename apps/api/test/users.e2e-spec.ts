import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
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

// 응답을 타입 단언 대신 스키마로 검증한다 — 계약이 어긋나면 여기서 바로 실패한다
const loginBodySchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  isNewUser: z.boolean(),
  user: z.object({ id: z.string().min(1), nickname: z.string().nullable() }),
});

type LoginBody = z.infer<typeof loginBodySchema>;

const login = async (kakaoToken: string): Promise<LoginBody> =>
  loginBodySchema.parse(
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
