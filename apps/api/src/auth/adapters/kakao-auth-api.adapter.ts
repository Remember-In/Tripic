import {
  BadGatewayException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { z } from "zod";
import type {
  KakaoAuthClient,
  KakaoCodeExchange,
} from "@/auth/ports/kakao-auth-client.port";
import type { KakaoWebConfig } from "@/config/kakao-web-config";

const KAKAO_AUTH_BASE = "https://kauth.kakao.com";
const KAKAO_TIMEOUT_MS = 5_000;

// 카카오 응답은 신뢰하지 않고 런타임 검증한다 — 토큰 누락 시 빈 토큰으로 진행하지 않도록
const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
});

const errorResponseSchema = z.object({ error: z.string() });

/**
 * 카카오 OAuth authorization code 교환 outbound adapter (docs/15 §2).
 *
 * 상류 응답의 error_description·본문에는 요청 파라미터가 되울릴 수 있으므로
 * 진단용으로는 짧은 error 코드만 쓰고 나머지는 흘려보내지 않는다.
 */
export class KakaoAuthApiAdapter implements KakaoAuthClient {
  private readonly restApiKey: string;
  private readonly redirectUris: readonly string[];
  private readonly clientSecret: string | null;

  constructor(kakaoWeb: KakaoWebConfig) {
    this.restApiKey = kakaoWeb.restApiKey;
    this.redirectUris = kakaoWeb.redirectUris;
    this.clientSecret = kakaoWeb.clientSecret;
  }

  async exchangeAuthorizationCode(
    input: KakaoCodeExchange,
  ): Promise<{ kakaoAccessToken: string }> {
    // 허용목록 대조가 먼저다 — 임의 주소로 code 를 교환하려는 요청은 카카오까지 보내지 않는다
    if (!this.redirectUris.includes(input.redirectUri)) {
      throw new BadRequestException("redirect uri is not allowed");
    }

    const params: Record<string, string> = {
      grant_type: "authorization_code",
      client_id: this.restApiKey,
      redirect_uri: input.redirectUri,
      code: input.code,
    };
    if (this.clientSecret) {
      params.client_secret = this.clientSecret;
    }

    const response = await this.post("/oauth/token", params);

    if (!response.ok) {
      const error = await this.readError(response);
      if (error === "invalid_grant") {
        throw new UnauthorizedException("invalid kakao authorization code");
      }
      throw new BadGatewayException(`kakao token error: ${error}`);
    }

    const body = tokenResponseSchema.safeParse(await this.readJson(response));
    if (!body.success) {
      throw new BadGatewayException("kakao token returned unexpected response");
    }
    return { kakaoAccessToken: body.data.access_token };
  }

  private async post(
    path: string,
    params: Record<string, string>,
  ): Promise<Response> {
    try {
      return await fetch(`${KAKAO_AUTH_BASE}${path}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
        signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
      });
    } catch {
      // 원본 예외 메시지에 요청 정보가 섞여 있을 수 있어 그대로 감싸지 않는다
      throw new BadGatewayException("kakao auth api unreachable");
    }
  }

  /** 상류 error 코드만 꺼낸다 — error_description 과 본문은 쓰지 않는다 */
  private async readError(response: Response): Promise<string> {
    const body = errorResponseSchema.safeParse(await this.readJson(response));
    return body.success ? body.data.error : `status ${response.status}`;
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }
}
