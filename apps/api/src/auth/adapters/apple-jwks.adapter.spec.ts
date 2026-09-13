import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadGatewayException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppleJwksAdapter } from "@/auth/adapters/apple-jwks.adapter";
import type { Env } from "@/config/env";

const CLIENT_ID = "com.tripic.app";
const ISSUER = "https://appleid.apple.com";
const KID = "apple-key-1";

const appleKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const attackerKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = appleKeys.publicKey.export({ format: "jwk" });

const segment = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

/** 테스트용 RS256 JWT 서명 — header 의 alg 는 일부러 바꿀 수 있게 열어 둔다 */
const signJwt = (
  payload: Record<string, unknown>,
  options: { alg?: string; kid?: string; key?: KeyObject } = {},
) => {
  const input = `${segment({ alg: options.alg ?? "RS256", kid: options.kid ?? KID })}.${segment(payload)}`;
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(input),
    options.key ?? appleKeys.privateKey,
  );
  return `${input}.${signature.toString("base64url")}`;
};

const nowSec = () => Math.floor(Date.now() / 1000);

const identityClaims = (overrides: Record<string, unknown> = {}) => ({
  iss: ISSUER,
  aud: CLIENT_ID,
  sub: "001234.apple-user",
  iat: nowSec(),
  exp: nowSec() + 600,
  ...overrides,
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const jwksBody = {
  keys: [
    {
      kty: "RSA",
      kid: KID,
      use: "sig",
      alg: "RS256",
      n: publicJwk.n,
      e: publicJwk.e,
    },
  ],
};

describe("AppleJwksAdapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let adapter: AppleJwksAdapter;

  beforeEach(() => {
    // Response 본문은 한 번만 읽을 수 있어 호출마다 새로 만든다
    fetchMock = vi.fn(async () => jsonResponse(200, jwksBody));
    vi.stubGlobal("fetch", fetchMock);
    adapter = new AppleJwksAdapter(
      new ConfigService<Env, true>({ APPLE_CLIENT_ID: CLIENT_ID }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("verifyIdentityToken", () => {
    it("Apple 키로 서명된 유효한 토큰이면 sub 를 돌려준다", async () => {
      await expect(
        adapter.verifyIdentityToken(signJwt(identityClaims())),
      ).resolves.toEqual({ appleUserId: "001234.apple-user" });
    });

    it("aud 가 배열이어도 우리 앱이 포함돼 있으면 통과한다", async () => {
      await expect(
        adapter.verifyIdentityToken(
          signJwt(identityClaims({ aud: ["other.app", CLIENT_ID] })),
        ),
      ).resolves.toEqual({ appleUserId: "001234.apple-user" });
    });

    it("다른 앱에 발급된 토큰(aud 불일치)이면 401", async () => {
      await expect(
        adapter.verifyIdentityToken(
          signJwt(identityClaims({ aud: "com.other.app" })),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("발급자가 Apple 이 아니면 401", async () => {
      await expect(
        adapter.verifyIdentityToken(
          signJwt(identityClaims({ iss: "https://evil.example.com" })),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("만료된 토큰이면 401", async () => {
      await expect(
        adapter.verifyIdentityToken(
          signJwt(identityClaims({ exp: nowSec() - 1 })),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("exp 가 없는 토큰이면 401", async () => {
      await expect(
        adapter.verifyIdentityToken(
          signJwt(identityClaims({ exp: undefined })),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("sub 가 없으면 401", async () => {
      await expect(
        adapter.verifyIdentityToken(signJwt(identityClaims({ sub: "" }))),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("Apple 이 아닌 키로 서명했으면 401", async () => {
      await expect(
        adapter.verifyIdentityToken(
          signJwt(identityClaims(), { key: attackerKeys.privateKey }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("payload 를 바꿔치기하면 서명이 맞지 않아 401", async () => {
      const [header, , signature] = signJwt(identityClaims()).split(".");
      const forged = `${header}.${segment(identityClaims({ sub: "victim" }))}.${signature}`;

      await expect(adapter.verifyIdentityToken(forged)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("헤더 alg 가 RS256 이 아니면 서명이 맞아도 401 — 토큰이 알고리즘을 고르게 두지 않는다", async () => {
      await expect(
        adapter.verifyIdentityToken(
          signJwt(identityClaims(), { alg: "HS256" }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("JWKS 에 없는 kid 면 401", async () => {
      await expect(
        adapter.verifyIdentityToken(
          signJwt(identityClaims(), { kid: "rotated-away" }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("JWT 형식이 아니면 Apple 을 호출하지 않고 401", async () => {
      await expect(
        adapter.verifyIdentityToken("not-a-jwt"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("공개키를 캐시하지 않는다 — 검증할 때마다 JWKS 를 조회한다", async () => {
      await adapter.verifyIdentityToken(signJwt(identityClaims()));
      await adapter.verifyIdentityToken(signJwt(identityClaims()));

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://appleid.apple.com/auth/keys",
        expect.anything(),
      );
    });

    it("JWKS 조회가 네트워크 오류면 502", async () => {
      fetchMock.mockImplementation(async () => {
        throw new TypeError("fetch failed");
      });
      await expect(
        adapter.verifyIdentityToken(signJwt(identityClaims())),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it("JWKS 가 5xx 면 502", async () => {
      fetchMock.mockImplementation(async () => jsonResponse(503, {}));
      await expect(
        adapter.verifyIdentityToken(signJwt(identityClaims())),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it("JWKS 응답 형식이 예상과 다르면 502", async () => {
      fetchMock.mockImplementation(async () =>
        jsonResponse(200, { nope: true }),
      );
      await expect(
        adapter.verifyIdentityToken(signJwt(identityClaims())),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe("verifyNotification", () => {
    const notificationClaims = (overrides: Record<string, unknown> = {}) => ({
      iss: ISSUER,
      aud: CLIENT_ID,
      iat: nowSec(),
      jti: "notification-1",
      events: JSON.stringify({
        type: "consent-revoked",
        sub: "001234.apple-user",
        event_time: Date.now(),
      }),
      ...overrides,
    });

    it("events 가 JSON 문자열이면 파싱해서 type·sub 를 돌려준다", async () => {
      await expect(
        adapter.verifyNotification(signJwt(notificationClaims())),
      ).resolves.toEqual({
        type: "consent-revoked",
        appleUserId: "001234.apple-user",
      });
    });

    it("events 가 객체로 와도 받는다", async () => {
      await expect(
        adapter.verifyNotification(
          signJwt(
            notificationClaims({
              events: { type: "account-delete", sub: "001234.apple-user" },
            }),
          ),
        ),
      ).resolves.toEqual({
        type: "account-delete",
        appleUserId: "001234.apple-user",
      });
    });

    it("다른 앱으로 보낸 알림이면 401", async () => {
      await expect(
        adapter.verifyNotification(
          signJwt(notificationClaims({ aud: "com.other.app" })),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("Apple 이 아닌 키로 서명한 알림이면 401", async () => {
      await expect(
        adapter.verifyNotification(
          signJwt(notificationClaims(), { key: attackerKeys.privateKey }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("events 가 깨진 JSON 이면 401", async () => {
      await expect(
        adapter.verifyNotification(
          signJwt(notificationClaims({ events: "{oops" })),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("exp 가 지난 알림이면 401", async () => {
      await expect(
        adapter.verifyNotification(
          signJwt(notificationClaims({ exp: nowSec() - 1 })),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
