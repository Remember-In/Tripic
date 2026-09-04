import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import type { Env } from "@/config/env";
import type { KakaoVerifier } from "@/auth/ports/kakao-verifier.port";

const KAKAO_API_BASE = "https://kapi.kakao.com";
const KAKAO_TIMEOUT_MS = 5_000;

// 카카오 응답은 신뢰하지 않고 런타임 검증한다 — id 누락 시 "undefined" 계정 생성 방지
const kakaoTokenInfoSchema = z.object({
  id: z.number(),
  app_id: z.number(),
});

const kakaoMeSchema = z.object({
  id: z.number(),
});

/** 카카오 access token 검증 outbound adapter (docs/10-auth-db-design.md §2) */
@Injectable()
export class KakaoApiAdapter implements KakaoVerifier {
  private readonly appId: number;

  constructor(config: ConfigService<Env, true>) {
    this.appId = config.get("KAKAO_APP_ID", { infer: true });
  }

  /**
   * 토큰 소속 앱 검증 후 카카오 사용자 id를 반환한다.
   * app_id 불일치 = 타 카카오 앱에서 발급된 토큰(토큰 치환) → 401.
   */
  async verifyAccessToken(
    kakaoAccessToken: string,
  ): Promise<{ kakaoUserId: string }> {
    const tokenInfo = await this.kakaoGet(
      "/v1/user/access_token_info",
      kakaoAccessToken,
      kakaoTokenInfoSchema,
    );
    if (tokenInfo.app_id !== this.appId) {
      throw new UnauthorizedException("kakao token issued for another app");
    }

    const me = await this.kakaoGet(
      "/v2/user/me",
      kakaoAccessToken,
      kakaoMeSchema,
    );
    return { kakaoUserId: String(me.id) };
  }

  private async kakaoGet<T>(
    path: string,
    token: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${KAKAO_API_BASE}${path}`, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
      });
    } catch {
      throw new BadGatewayException("kakao api unreachable");
    }

    if (response.status === 401) {
      throw new UnauthorizedException("invalid kakao token");
    }
    if (!response.ok) {
      throw new BadGatewayException(`kakao api error: ${response.status}`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new BadGatewayException("kakao api returned non-json response");
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new BadGatewayException("kakao api returned unexpected response");
    }
    return parsed.data;
  }
}
