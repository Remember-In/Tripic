import { createPrivateKey, type KeyObject } from "node:crypto";
import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import { APPLE_ISSUER, decodeJws, signEs256 } from "@/auth/adapters/apple-jwt";
import type { AppleAuthClient } from "@/auth/ports/apple-auth-client.port";
import type { Env } from "@/config/env";

const APPLE_TIMEOUT_MS = 5_000;
/** client_secret 수명 — 호출마다 새로 서명하므로 짧게 둔다 (docs/14 §3.2) */
const CLIENT_SECRET_TTL_SEC = 300;

const tokenResponseSchema = z.object({
  refresh_token: z.string().min(1),
  id_token: z.string().min(1),
});

const idTokenClaimsSchema = z.object({ sub: z.string().min(1) });

const errorResponseSchema = z.object({ error: z.string() });

/** Apple REST API outbound adapter — `/auth/token` 교환과 `/auth/revoke` (docs/14 §3·§6) */
@Injectable()
export class AppleAuthApiAdapter implements AppleAuthClient {
  private readonly clientId: string;
  private readonly teamId: string;
  private readonly keyId: string;
  private readonly privateKey: KeyObject;

  constructor(config: ConfigService<Env, true>) {
    this.clientId = config.get("APPLE_CLIENT_ID", { infer: true });
    this.teamId = config.get("APPLE_TEAM_ID", { infer: true });
    this.keyId = config.get("APPLE_KEY_ID", { infer: true });
    this.privateKey = createPrivateKey(
      config.get("APPLE_PRIVATE_KEY", { infer: true }),
    );
  }

  async exchangeAuthorizationCode(
    authorizationCode: string,
  ): Promise<{ refreshToken: string; appleUserId: string }> {
    const response = await this.post("/auth/token", {
      code: authorizationCode,
      grant_type: "authorization_code",
    });

    if (!response.ok) {
      const error = await this.readError(response);
      if (error === "invalid_grant") {
        throw new UnauthorizedException("invalid apple authorization code");
      }
      throw new BadGatewayException(`apple token error: ${error}`);
    }

    const body = tokenResponseSchema.safeParse(await this.readJson(response));
    if (!body.success) {
      throw new BadGatewayException("apple token returned unexpected response");
    }
    // id_token 은 Apple 과 TLS 로 직접 주고받은 응답이라 서명 대신 형식만 확인한다
    const claims = idTokenClaimsSchema.safeParse(
      decodeJws(body.data.id_token)?.payload,
    );
    if (!claims.success) {
      throw new BadGatewayException("apple token returned malformed id_token");
    }
    return {
      refreshToken: body.data.refresh_token,
      appleUserId: claims.data.sub,
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const response = await this.post("/auth/revoke", {
      token: refreshToken,
      token_type_hint: "refresh_token",
    });
    if (response.ok) return;

    // 이미 폐기됐거나 사용자가 연결을 끊어 무효가 된 토큰 — 목적(폐기)은 이미 달성됐다
    const error = await this.readError(response);
    if (error === "invalid_grant") return;
    throw new BadGatewayException(`apple revoke error: ${error}`);
  }

  private async post(
    path: string,
    params: Record<string, string>,
  ): Promise<Response> {
    const body = new URLSearchParams({
      ...params,
      client_id: this.clientId,
      client_secret: this.signClientSecret(),
    });
    try {
      return await fetch(`${APPLE_ISSUER}${path}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(APPLE_TIMEOUT_MS),
      });
    } catch {
      throw new BadGatewayException("apple auth api unreachable");
    }
  }

  /** 캐시 없이 호출마다 새로 서명한다 (docs/14 §3.2) */
  private signClientSecret(): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    return signEs256(
      { kid: this.keyId },
      {
        iss: this.teamId,
        iat: issuedAt,
        exp: issuedAt + CLIENT_SECRET_TTL_SEC,
        aud: APPLE_ISSUER,
        sub: this.clientId,
      },
      this.privateKey,
    );
  }

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
