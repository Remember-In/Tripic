import { afterEach, describe, expect, it, vi } from "vitest";
import { BadGatewayException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { KakaoApiAdapter } from "@/auth/adapters/kakao-api.adapter";
import type { Env } from "@/config/env";

const APP_ID = 123456;

const configStub = {
  get: (key: string) =>
    ({ KAKAO_APP_ID: APP_ID, KAKAO_CLIENT_SECRET: "client-secret" })[key],
} as unknown as ConfigService<Env, true>;

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("KakaoApiAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("유효한 토큰이면 kakao user id를 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { id: 999, app_id: APP_ID }))
        .mockResolvedValueOnce(jsonResponse(200, { id: 999 })),
    );
    const service = new KakaoApiAdapter(configStub);
    await expect(service.verifyAccessToken("token")).resolves.toEqual({
      kakaoUserId: "999",
    });
  });

  it("웹 authorization code를 카카오 access token으로 교환한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(200, { access_token: "web-access-token" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const service = new KakaoApiAdapter(configStub);
    await expect(
      service.exchangeAuthorizationCode({
        code: "authorization-code",
        redirectUri: "https://tripic.example/auth/kakao/callback",
        restApiKey: "rest-api-key",
      }),
    ).resolves.toBe("web-access-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://kauth.kakao.com/oauth/token",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(String(request.body)).toContain("grant_type=authorization_code");
    expect(String(request.body)).toContain("client_id=rest-api-key");
    expect(String(request.body)).toContain("client_secret=client-secret");
  });

  it("app_id가 다르면 401 (타 카카오 앱 토큰 차단)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { id: 999, app_id: 654321 })),
    );
    const service = new KakaoApiAdapter(configStub);
    await expect(service.verifyAccessToken("token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("카카오가 401을 반환하면 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(401, { code: -401 })),
    );
    const service = new KakaoApiAdapter(configStub);
    await expect(service.verifyAccessToken("bad")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("네트워크 오류면 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));
    const service = new KakaoApiAdapter(configStub);
    await expect(service.verifyAccessToken("token")).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it("카카오 5xx면 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(500, { msg: "boom" })),
    );
    const service = new KakaoApiAdapter(configStub);
    await expect(service.verifyAccessToken("token")).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('me 응답에 id가 없으면 502 ("undefined" 계정 생성 방지)', async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { id: 999, app_id: APP_ID }))
        .mockResolvedValueOnce(jsonResponse(200, { connected_at: "..." })),
    );
    const service = new KakaoApiAdapter(configStub);
    await expect(service.verifyAccessToken("token")).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it("access_token_info 응답에 app_id가 없으면 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { id: 999 })),
    );
    const service = new KakaoApiAdapter(configStub);
    await expect(service.verifyAccessToken("token")).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it("JSON이 아닌 200 응답이면 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>gateway</html>", { status: 200 }),
        ),
    );
    const service = new KakaoApiAdapter(configStub);
    await expect(service.verifyAccessToken("token")).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
