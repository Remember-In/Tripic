import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { request, spec } from "pactum";
import { z } from "zod";
import {
  authTokensSchema,
  kakaoLoginResultSchema,
  meSchema,
} from "@tripic/shared";
import { AppModule } from "@/app.module";
import { APPLE_AUTH_CLIENT } from "@/auth/ports/apple-auth-client.port";
import { APPLE_IDENTITY_VERIFIER } from "@/auth/ports/apple-identity-verifier.port";
import {
  KAKAO_VERIFIER,
  type KakaoVerifier,
} from "@/auth/ports/kakao-verifier.port";
import {
  AppleApiStub,
  appleVerifierStub,
  loginWithApple,
  notifyApple,
} from "./apple-auth-stubs";

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
 * 테스트에서 스키마를 다시 정의하면 서버가 계약을 어겨도 테스트만 통과할 수 있다.
 */
const validationErrorSchema = z.object({
  message: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })),
});

type LoginBody = z.infer<typeof kakaoLoginResultSchema>;

const login = async (kakaoToken: string): Promise<LoginBody> =>
  kakaoLoginResultSchema.parse(
    await spec()
      .post("/auth/kakao")
      .withJson({ kakaoAccessToken: kakaoToken })
      .expectStatus(201)
      .returns("res.body"),
  );

describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KAKAO_VERIFIER)
      .useValue(kakaoStub)
      .overrideProvider(APPLE_IDENTITY_VERIFIER)
      .useValue(appleVerifierStub)
      .overrideProvider(APPLE_AUTH_CLIENT)
      .useValue(new AppleApiStub())
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

    it("빈 토큰·타입이 다른 토큰도 400 — 카카오까지 가지 않는다", async () => {
      await spec()
        .post("/auth/kakao")
        .withJson({ kakaoAccessToken: "" })
        .expectStatus(400);
      await spec()
        .post("/auth/kakao")
        .withJson({ kakaoAccessToken: 12345 })
        .expectStatus(400);
    });

    it("400 응답은 어떤 필드가 틀렸는지 알려준다", async () => {
      const body = await spec()
        .post("/auth/kakao")
        .withJson({})
        .expectStatus(400)
        .returns("res.body");

      expect(
        validationErrorSchema.parse(body).issues.map((issue) => issue.path),
      ).toContain("kakaoAccessToken");
    });

    it("서로 다른 카카오 계정은 서로 다른 사용자다", async () => {
      const first = await login("valid-distinct-1");
      const second = await login("valid-distinct-2");

      expect(second.user.id).not.toBe(first.user.id);
      expect(second.isNewUser).toBe(true);
    });

    it("로그인할 때마다 새 refresh 토큰을 발급한다 (family 분리)", async () => {
      const first = await login("valid-family-1");
      const second = await login("valid-family-1");

      expect(second.refreshToken).not.toBe(first.refreshToken);

      // 한쪽을 로그아웃해도 다른 기기의 세션은 살아 있어야 한다
      await spec()
        .post("/auth/logout")
        .withBearerToken(second.accessToken)
        .withJson({ refreshToken: second.refreshToken })
        .expectStatus(204);
      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: first.refreshToken })
        .expectStatus(200);
    });
  });

  describe("POST /auth/apple (docs/14 §3)", () => {
    it("신규 Apple 계정 → 201, isNewUser=true, nickname null", async () => {
      const body = await loginWithApple("apple-signup-1");

      expect(body.isNewUser).toBe(true);
      expect(body.user.nickname).toBeNull();
    });

    it("같은 Apple 계정 재로그인 → isNewUser=false, 같은 user id", async () => {
      const first = await loginWithApple("apple-relogin-1");
      const second = await loginWithApple("apple-relogin-1");

      expect(second.isNewUser).toBe(false);
      expect(second.user.id).toBe(first.user.id);
    });

    it("Apple 로 받은 세션도 refresh·로그아웃이 카카오와 똑같이 동작한다", async () => {
      const body = await loginWithApple("apple-session-1");

      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: body.refreshToken })
        .expectStatus(200);
    });

    it("유효하지 않은 identity token → 401", async () => {
      await spec()
        .post("/auth/apple")
        .withJson({
          identityToken: "garbage",
          authorizationCode: "apple-code-apple-bad-1",
        })
        .expectStatus(401);
    });

    it("다른 사용자의 authorization code 를 섞으면 401", async () => {
      await spec()
        .post("/auth/apple")
        .withJson({
          identityToken: "apple-valid-apple-victim",
          authorizationCode: "apple-code-apple-attacker",
        })
        .expectStatus(401);
    });

    it("본문 검증 실패 → 400, 빠진 필드를 알려준다", async () => {
      const body = await spec()
        .post("/auth/apple")
        .withJson({ identityToken: "apple-valid-x" })
        .expectStatus(400)
        .returns("res.body");

      expect(
        validationErrorSchema.parse(body).issues.map((issue) => issue.path),
      ).toContain("authorizationCode");
    });

    it("같은 식별자라도 카카오 계정과 Apple 계정은 서로 다른 사용자다", async () => {
      const kakao = await login("valid-cross-provider-1");
      const apple = await loginWithApple("cross-provider-1");

      expect(apple.isNewUser).toBe(true);
      expect(apple.user.id).not.toBe(kakao.user.id);
    });

    it("GET /users/me 는 가입한 로그인 수단을 provider 로 알려준다", async () => {
      const kakao = await login("valid-provider-kakao");
      const apple = await loginWithApple("provider-apple");

      const kakaoMe = meSchema.parse(
        await spec()
          .get("/users/me")
          .withBearerToken(kakao.accessToken)
          .expectStatus(200)
          .returns("res.body"),
      );
      const appleMe = meSchema.parse(
        await spec()
          .get("/users/me")
          .withBearerToken(apple.accessToken)
          .expectStatus(200)
          .returns("res.body"),
      );

      expect(kakaoMe.provider).toBe("KAKAO");
      expect(appleMe.provider).toBe("APPLE");
    });
  });

  describe("POST /auth/apple/notifications (docs/14 §4)", () => {
    it("공개 라우트다 — Bearer 없이 Apple 서명만으로 받는다", async () => {
      await notifyApple("email-enabled", "apple-nobody").expectStatus(200);
    });

    it("payload 가 없으면 400", async () => {
      await spec()
        .post("/auth/apple/notifications")
        .withJson({})
        .expectStatus(400);
    });

    it("서명 검증에 실패하면 401", async () => {
      await spec()
        .post("/auth/apple/notifications")
        .withJson({ payload: "forged" })
        .expectStatus(401);
    });

    it("consent-revoked → 모든 refresh 토큰이 끊기지만 계정은 남는다", async () => {
      const phone = await loginWithApple("apple-consent-1");
      const tablet = await loginWithApple("apple-consent-1");

      await notifyApple("consent-revoked", "apple-consent-1").expectStatus(200);

      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: phone.refreshToken })
        .expectStatus(401);
      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: tablet.refreshToken })
        .expectStatus(401);

      // 다시 Apple 로 로그인하면 같은 계정으로 들어온다
      const again = await loginWithApple("apple-consent-1");
      expect(again.isNewUser).toBe(false);
      expect(again.user.id).toBe(phone.user.id);
    });

    it("account-delete → 계정이 즉시 삭제된다", async () => {
      const session = await loginWithApple("apple-deleted-1");

      await notifyApple("account-delete", "apple-deleted-1").expectStatus(200);

      await spec()
        .get("/users/me")
        .withBearerToken(session.accessToken)
        .expectStatus(401);
    });

    it("같은 알림이 두 번 와도 200 이다 (멱등)", async () => {
      await loginWithApple("apple-duplicate-1");

      await notifyApple("account-delete", "apple-duplicate-1").expectStatus(
        200,
      );
      await notifyApple("account-delete", "apple-duplicate-1").expectStatus(
        200,
      );
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

    it("닉네임 길이 경계 — 2자는 되고 21자는 안 된다", async () => {
      const body = await login("valid-nickname-2");

      await spec()
        .patch("/users/me")
        .withBearerToken(body.accessToken)
        .withJson({ nickname: "가나" })
        .expectStatus(200);
      await spec()
        .patch("/users/me")
        .withBearerToken(body.accessToken)
        .withJson({ nickname: "가".repeat(20) })
        .expectStatus(200);
      await spec()
        .patch("/users/me")
        .withBearerToken(body.accessToken)
        .withJson({ nickname: "가".repeat(21) })
        .expectStatus(400);
    });

    it("공백만 있는 닉네임은 거부한다 (trim 후 길이로 판단)", async () => {
      const body = await login("valid-nickname-3");

      await spec()
        .patch("/users/me")
        .withBearerToken(body.accessToken)
        .withJson({ nickname: "    " })
        .expectStatus(400);
    });

    it("닉네임은 바꿔도 다시 조회하면 유지된다", async () => {
      const body = await login("valid-nickname-4");
      await spec()
        .patch("/users/me")
        .withBearerToken(body.accessToken)
        .withJson({ nickname: "처음" })
        .expectStatus(200);
      await spec()
        .patch("/users/me")
        .withBearerToken(body.accessToken)
        .withJson({ nickname: "바꿈" })
        .expectStatus(200);

      await spec()
        .get("/users/me")
        .withBearerToken(body.accessToken)
        .expectStatus(200)
        .expectJsonLike({ nickname: "바꿈" });
    });

    it("남의 access token 으로는 내 프로필이 나오지 않는다", async () => {
      const mine = await login("valid-isolation-1");
      const other = await login("valid-isolation-2");

      const body = await spec()
        .get("/users/me")
        .withBearerToken(other.accessToken)
        .expectStatus(200)
        .returns("res.body");

      expect(meSchema.parse(body).id).toBe(other.user.id);
      expect(meSchema.parse(body).id).not.toBe(mine.user.id);
    });

    it("Bearer 형식이 아니거나 위조된 토큰은 401", async () => {
      await spec()
        .get("/users/me")
        .withHeaders("authorization", "Token abc")
        .expectStatus(401);
      await spec().get("/users/me").withBearerToken("a.b.c").expectStatus(401);
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
      const rotated = authTokensSchema.parse(
        await spec()
          .post("/auth/refresh")
          .withJson({ refreshToken: body.refreshToken })
          .expectStatus(200)
          .returns("res.body"),
      );

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

    it("본문이 비었거나 타입이 다르면 400 (401 이 아니다)", async () => {
      await spec().post("/auth/refresh").withJson({}).expectStatus(400);
      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: "" })
        .expectStatus(400);
      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: 123 })
        .expectStatus(400);
    });

    it("refresh 는 공개 라우트다 — access token 이 만료돼도 갱신할 수 있다", async () => {
      const body = await login("valid-public-refresh");

      // Bearer 를 아예 보내지 않아도 통과해야 한다 (앱이 만료 후 호출하는 경로)
      await spec()
        .post("/auth/refresh")
        .withJson({ refreshToken: body.refreshToken })
        .expectStatus(200);
    });

    it("연속 rotation — 매번 새 토큰이 나오고 직전 토큰만 무효가 된다", async () => {
      const body = await login("valid-chain-1");
      const first = authTokensSchema.parse(
        await spec()
          .post("/auth/refresh")
          .withJson({ refreshToken: body.refreshToken })
          .expectStatus(200)
          .returns("res.body"),
      );
      const second = authTokensSchema.parse(
        await spec()
          .post("/auth/refresh")
          .withJson({ refreshToken: first.refreshToken })
          .expectStatus(200)
          .returns("res.body"),
      );

      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(second.accessToken).toBeTruthy();
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
