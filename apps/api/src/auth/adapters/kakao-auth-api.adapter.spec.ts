import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BadGatewayException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { KakaoAuthApiAdapter } from "@/auth/adapters/kakao-auth-api.adapter";
import type { KakaoWebConfig } from "@/config/kakao-web-config";

const REST_API_KEY = "kakao-rest-api-key";
const REDIRECT_URI = "https://tripic.example/auth/kakao/callback";

const kakaoWeb = (overrides: Partial<KakaoWebConfig> = {}): KakaoWebConfig => ({
  restApiKey: REST_API_KEY,
  redirectUris: [REDIRECT_URI, "http://localhost:5173/auth/kakao/callback"],
  clientSecret: null,
  ...overrides,
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const exchange = { code: "authorization-code", redirectUri: REDIRECT_URI };

/** 요청 본문(form-urlencoded)을 파싱해 돌려준다 */
const sentBody = (fetchMock: ReturnType<typeof vi.fn>) => {
  const init: unknown = fetchMock.mock.calls[0]?.[1];
  if (!init || typeof init !== "object" || !("body" in init)) {
    throw new Error("fetch 가 본문 없이 호출됐다");
  }
  const body = init.body;
  if (typeof body !== "string") {
    throw new Error("본문이 문자열이 아니다");
  }
  return new URLSearchParams(body);
};

describe("KakaoAuthApiAdapter (docs/15 §2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("code 를 교환해 카카오 access token 을 돌려준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(200, { access_token: "kakao-access-token" }),
        ),
    );

    await expect(
      new KakaoAuthApiAdapter(kakaoWeb()).exchangeAuthorizationCode(exchange),
    ).resolves.toEqual({ kakaoAccessToken: "kakao-access-token" });
  });

  it("카카오 토큰 엔드포인트에 form-urlencoded 로 보낸다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { access_token: "t" }));
    vi.stubGlobal("fetch", fetchMock);

    await new KakaoAuthApiAdapter(kakaoWeb()).exchangeAuthorizationCode(
      exchange,
    );

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://kauth.kakao.com/oauth/token",
    );
    const body = sentBody(fetchMock);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("client_id")).toBe(REST_API_KEY);
    expect(body.get("redirect_uri")).toBe(REDIRECT_URI);
    expect(body.get("code")).toBe("authorization-code");
  });

  it("client secret 을 켠 서버면 함께 보낸다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { access_token: "t" }));
    vi.stubGlobal("fetch", fetchMock);

    await new KakaoAuthApiAdapter(
      kakaoWeb({ clientSecret: "kakao-client-secret" }),
    ).exchangeAuthorizationCode(exchange);

    expect(sentBody(fetchMock).get("client_secret")).toBe(
      "kakao-client-secret",
    );
  });

  it("client secret 을 끈 서버면 보내지 않는다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { access_token: "t" }));
    vi.stubGlobal("fetch", fetchMock);

    await new KakaoAuthApiAdapter(kakaoWeb()).exchangeAuthorizationCode(
      exchange,
    );

    expect(sentBody(fetchMock).has("client_secret")).toBe(false);
  });

  it("허용목록에 없는 redirectUri 는 400 이고 카카오를 호출하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new KakaoAuthApiAdapter(kakaoWeb()).exchangeAuthorizationCode({
        code: "authorization-code",
        redirectUri: "https://evil.example/callback",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("만료·재사용 code(invalid_grant)는 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(400, { error: "invalid_grant" })),
    );

    await expect(
      new KakaoAuthApiAdapter(kakaoWeb()).exchangeAuthorizationCode(exchange),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("그 밖의 카카오 오류는 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(400, { error: "invalid_client" })),
    );

    await expect(
      new KakaoAuthApiAdapter(kakaoWeb()).exchangeAuthorizationCode(exchange),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("네트워크 실패는 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));

    await expect(
      new KakaoAuthApiAdapter(kakaoWeb()).exchangeAuthorizationCode(exchange),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("비-JSON 응답은 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })),
    );

    await expect(
      new KakaoAuthApiAdapter(kakaoWeb()).exchangeAuthorizationCode(exchange),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("access_token 이 빠진 응답은 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { token_type: "bearer" })),
    );

    await expect(
      new KakaoAuthApiAdapter(kakaoWeb()).exchangeAuthorizationCode(exchange),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  /**
   * 상류 응답은 요청 파라미터를 되울릴 수 있다. 진단용으로 쓰는 값은 짧은 error 코드로 좁히고,
   * error_description·본문·예외 메시지는 그대로 흘려보내지 않는다.
   */
  it("상류 응답·예외에 섞인 REST 키가 에러 메시지로 새지 않는다", async () => {
    const failures = [
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: "invalid_client",
          error_description: `bad key ${REST_API_KEY}`,
        }),
      ),
      vi.fn().mockRejectedValue(new Error(`connect failed ${REST_API_KEY}`)),
      vi
        .fn()
        .mockResolvedValue(
          new Response(`<html>${REST_API_KEY}</html>`, { status: 500 }),
        ),
    ];

    for (const fetchMock of failures) {
      vi.stubGlobal("fetch", fetchMock);
      const error = await new KakaoAuthApiAdapter(kakaoWeb())
        .exchangeAuthorizationCode(exchange)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(Error);
      expect(String(error)).not.toContain(REST_API_KEY);
    }
  });
});
