import { generateKeyPairSync, verify } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BadGatewayException, UnauthorizedException } from "@nestjs/common";
import { z } from "zod";
import { AppleAuthApiAdapter } from "@/auth/adapters/apple-auth-api.adapter";

const appleKey = generateKeyPairSync("ec", { namedCurve: "prime256v1" });

const config = {
  clientId: "com.tripic.app",
  teamId: "TEAM123456",
  keyId: "KEY1234567",
  privateKey: appleKey.privateKey
    .export({ format: "pem", type: "pkcs8" })
    .toString(),
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Apple 응답의 id_token 은 서명 검증 대상이 아니라 payload 만 의미가 있다 */
const unsignedIdToken = (payload: Record<string, unknown>) =>
  `${Buffer.from('{"alg":"RS256"}').toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;

const clientSecretClaimsSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.string(),
  iat: z.number(),
  exp: z.number(),
});

/** fetch 에 실제로 실린 form 본문을 읽는다 */
const sentForm = (fetchMock: ReturnType<typeof vi.fn>, call = 0) => {
  const init = z
    .object({ body: z.string(), method: z.string() })
    .parse(fetchMock.mock.calls[call]?.[1]);
  return { method: init.method, form: new URLSearchParams(init.body) };
};

describe("AppleAuthApiAdapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let adapter: AppleAuthApiAdapter;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    adapter = new AppleAuthApiAdapter(config);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("exchangeAuthorizationCode", () => {
    it("code 를 교환해 refresh token 과 id_token 의 sub 를 돌려준다", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          access_token: "at",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "apple-refresh-token",
          id_token: unsignedIdToken({ sub: "001234.apple-user" }),
        }),
      );

      await expect(
        adapter.exchangeAuthorizationCode("auth-code"),
      ).resolves.toEqual({
        refreshToken: "apple-refresh-token",
        appleUserId: "001234.apple-user",
      });

      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "https://appleid.apple.com/auth/token",
      );
      const { method, form } = sentForm(fetchMock);
      expect(method).toBe("POST");
      expect(form.get("grant_type")).toBe("authorization_code");
      expect(form.get("code")).toBe("auth-code");
      expect(form.get("client_id")).toBe("com.tripic.app");
    });

    it("client_secret 은 개발자 키로 서명한 ES256 JWT 이고 수명이 짧다 (docs/14 §3.2)", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          refresh_token: "rt",
          id_token: unsignedIdToken({ sub: "s" }),
        }),
      );

      await adapter.exchangeAuthorizationCode("auth-code");

      const secret = sentForm(fetchMock).form.get("client_secret") ?? "";
      const [header = "", payload = "", signature = ""] = secret.split(".");
      expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({
        kid: "KEY1234567",
        alg: "ES256",
      });
      const claims = clientSecretClaimsSchema.parse(
        JSON.parse(Buffer.from(payload, "base64url").toString()),
      );
      expect(claims).toMatchObject({
        iss: "TEAM123456",
        sub: "com.tripic.app",
        aud: "https://appleid.apple.com",
      });
      expect(claims.exp - claims.iat).toBeLessThanOrEqual(300);
      expect(
        verify(
          "sha256",
          Buffer.from(`${header}.${payload}`),
          { key: appleKey.publicKey, dsaEncoding: "ieee-p1363" },
          Buffer.from(signature, "base64url"),
        ),
      ).toBe(true);
    });

    it("client_secret 을 캐시하지 않는다 — 호출마다 새로 서명한다", async () => {
      fetchMock.mockImplementation(async () =>
        jsonResponse(200, {
          refresh_token: "rt",
          id_token: unsignedIdToken({ sub: "s" }),
        }),
      );

      await adapter.exchangeAuthorizationCode("code-1");
      await adapter.exchangeAuthorizationCode("code-2");

      // ECDSA 서명은 매번 난수가 들어가 같은 claims 라도 서명이 달라진다
      expect(sentForm(fetchMock, 0).form.get("client_secret")).not.toBe(
        sentForm(fetchMock, 1).form.get("client_secret"),
      );
    });

    it("만료·재사용된 code(invalid_grant)면 401", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, { error: "invalid_grant" }),
      );
      await expect(
        adapter.exchangeAuthorizationCode("used"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("우리 설정 문제(invalid_client)는 사용자 잘못이 아니므로 502", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, { error: "invalid_client" }),
      );
      await expect(
        adapter.exchangeAuthorizationCode("code"),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it("Apple 5xx 면 502", async () => {
      fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));
      await expect(
        adapter.exchangeAuthorizationCode("code"),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it("네트워크 오류면 502", async () => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));
      await expect(
        adapter.exchangeAuthorizationCode("code"),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it("refresh_token 이 빠진 응답이면 502", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, { id_token: unsignedIdToken({ sub: "s" }) }),
      );
      await expect(
        adapter.exchangeAuthorizationCode("code"),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it("id_token 에 sub 가 없으면 502", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          refresh_token: "rt",
          id_token: unsignedIdToken({}),
        }),
      );
      await expect(
        adapter.exchangeAuthorizationCode("code"),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe("revokeRefreshToken", () => {
    it("refresh token 을 token_type_hint=refresh_token 으로 폐기한다", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

      await expect(
        adapter.revokeRefreshToken("apple-rt"),
      ).resolves.toBeUndefined();

      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "https://appleid.apple.com/auth/revoke",
      );
      const { form } = sentForm(fetchMock);
      expect(form.get("token")).toBe("apple-rt");
      expect(form.get("token_type_hint")).toBe("refresh_token");
      expect(form.get("client_id")).toBe("com.tripic.app");
      expect(form.get("client_secret")).toBeTruthy();
    });

    it("이미 무효한 토큰(invalid_grant)이면 성공으로 본다 — 폐기 목적은 달성됐다", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, { error: "invalid_grant" }),
      );
      await expect(
        adapter.revokeRefreshToken("stale"),
      ).resolves.toBeUndefined();
    });

    it("Apple 5xx 면 502 — 탈퇴를 중단시켜야 한다", async () => {
      fetchMock.mockResolvedValue(new Response("oops", { status: 503 }));
      await expect(
        adapter.revokeRefreshToken("apple-rt"),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it("그 밖의 400(invalid_client 등)도 502", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, { error: "invalid_client" }),
      );
      await expect(
        adapter.revokeRefreshToken("apple-rt"),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it("네트워크 오류면 502", async () => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));
      await expect(
        adapter.revokeRefreshToken("apple-rt"),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });
});
