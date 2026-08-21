import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
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

interface LoginBody {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
  user: { id: string; nickname: string | null };
}

const login = async (kakaoToken: string): Promise<LoginBody> =>
  (await spec()
    .post("/auth/kakao")
    .withJson({ kakaoAccessToken: kakaoToken })
    .expectStatus(201)
    .returns("res.body")) as LoginBody;

describe("Auth (e2e)", () => {
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

  describe("POST /auth/kakao", () => {
    it("신규 가입 → 201, isNewUser=true, nickname null", async () => {
      const body = await login("valid-signup-1");
      expect(body.isNewUser).toBe(true);
      expect(body.user.nickname).toBeNull();
      expect(body.accessToken).toBeTruthy();
      expect(body.refreshToken).toBeTruthy();
    });

    it("같은 카카오 계정 재로그인 → isNewUser=false, 같은 user id", async () => {
      const first = await login("valid-relogin-1");
      const second = await login("valid-relogin-1");
      expect(second.isNewUser).toBe(false);
      expect(second.user.id).toBe(first.user.id);
    });

    it("유효하지 않은 카카오 토큰 → 401", async () => {
      await spec()
        .post("/auth/kakao")
        .withJson({ kakaoAccessToken: "garbage" })
        .expectStatus(401);
    });

    it("본문 검증 실패 → 400", async () => {
      await spec().post("/auth/kakao").withJson({}).expectStatus(400);
    });
  });

  describe("GET/PATCH /users/me", () => {
    it("Bearer 없으면 401, 있으면 내 프로필", async () => {
      await spec().get("/users/me").expectStatus(401);

      const body = await login("valid-me-1");
      await spec()
        .get("/users/me")
        .withBearerToken(body.accessToken)
        .expectStatus(200)
        .expectJsonLike({ id: body.user.id, nickname: null });
    });

    it("닉네임 설정(온보딩) → 200, 검증 실패 → 400", async () => {
      const body = await login("valid-nickname-1");
      await spec()
        .patch("/users/me")
        .withBearerToken(body.accessToken)
        .withJson({ nickname: "  리민  " })
        .expectStatus(200)
        .expectJson({ id: body.user.id, nickname: "리민" });

      await spec()
        .patch("/users/me")
        .withBearerToken(body.accessToken)
        .withJson({ nickname: "a" })
        .expectStatus(400);
    });
  });

  describe("POST /auth/refresh — rotation + 재사용 감지", () => {
    it("정상 refresh → 새 토큰쌍", async () => {
      const body = await login("valid-refresh-1");
      const rotated = await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: body.refreshToken })
        .expectStatus(200)
        .returns("res.body");
      expect(rotated.refreshToken).not.toBe(body.refreshToken);
    });

    it("구 토큰 재사용 → 401 + family 전체 무효화 (rotation된 새 토큰도 죽는다)", async () => {
      const body = await login("valid-reuse-1");
      const rotated = (await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: body.refreshToken })
        .expectStatus(200)
        .returns("res.body")) as LoginBody;

      // 탈취 시나리오: 이미 교체된 구 토큰을 다시 사용
      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: body.refreshToken })
        .expectStatus(401);

      // 정상 발급된 새 토큰도 family revoke 로 무효화되어야 한다
      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: rotated.refreshToken })
        .expectStatus(401);
    });

    it("미등록 토큰 → 401", async () => {
      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: "unknown-token" })
        .expectStatus(401);
    });
  });

  describe("POST /auth/logout", () => {
    it("로그아웃 → 204, 이후 해당 refresh 토큰은 401", async () => {
      const body = await login("valid-logout-1");
      await spec()
        .post("/auth/logout")
        .withBearerToken(body.accessToken)
        .withJson({ refreshToken: body.refreshToken })
        .expectStatus(204);

      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: body.refreshToken })
        .expectStatus(401);
    });

    it("Bearer 없이 로그아웃 → 401", async () => {
      await spec()
        .post("/auth/logout")
        .withJson({ refreshToken: "whatever" })
        .expectStatus(401);
    });
  });
});
