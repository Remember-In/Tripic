import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import {
  APPLE_ISSUER,
  decodeJws,
  parseJsonOrUndefined,
  verifyRs256,
} from "@/auth/adapters/apple-jwt";
import type {
  AppleIdentityVerifier,
  AppleNotificationEvent,
} from "@/auth/ports/apple-identity-verifier.port";
import type { Env } from "@/config/env";

const APPLE_KEYS_URL = `${APPLE_ISSUER}/auth/keys`;
const APPLE_TIMEOUT_MS = 5_000;

const appleJwksSchema = z.object({
  keys: z.array(
    z.object({
      kty: z.string(),
      kid: z.string(),
      n: z.string(),
      e: z.string(),
    }),
  ),
});

const audienceSchema = z.union([z.string(), z.array(z.string())]);

const identityClaimsSchema = z.object({
  iss: z.literal(APPLE_ISSUER),
  aud: audienceSchema,
  sub: z.string().min(1),
  exp: z.number(),
});

const notificationEventSchema = z.object({
  type: z.string().min(1),
  sub: z.string().min(1),
});

const notificationClaimsSchema = z.object({
  iss: z.literal(APPLE_ISSUER),
  aud: audienceSchema,
  exp: z.number().optional(),
  // Apple 은 events 를 JSON 문자열로 보낸다. 객체로 와도 받는다 (docs/14 §4)
  events: z.preprocess(
    (value) =>
      typeof value === "string" ? parseJsonOrUndefined(value) : value,
    notificationEventSchema,
  ),
});

/**
 * Apple 서명 JWT 검증 outbound adapter (docs/14 §3.1·§4).
 * 서버에 캐시 계층을 두지 않으므로 공개키(JWKS)는 검증할 때마다 조회한다.
 */
@Injectable()
export class AppleJwksAdapter implements AppleIdentityVerifier {
  private readonly clientId: string;

  constructor(config: ConfigService<Env, true>) {
    this.clientId = config.get("APPLE_CLIENT_ID", { infer: true });
  }

  async verifyIdentityToken(
    identityToken: string,
  ): Promise<{ appleUserId: string }> {
    const payload = await this.verifySignature(identityToken);
    const claims = identityClaimsSchema.safeParse(payload);
    if (!claims.success) {
      throw new UnauthorizedException("invalid apple identity token claims");
    }
    this.assertAudience(claims.data.aud);
    this.assertNotExpired(claims.data.exp);
    return { appleUserId: claims.data.sub };
  }

  async verifyNotification(payload: string): Promise<AppleNotificationEvent> {
    const verified = await this.verifySignature(payload);
    const claims = notificationClaimsSchema.safeParse(verified);
    if (!claims.success) {
      throw new UnauthorizedException("invalid apple notification claims");
    }
    this.assertAudience(claims.data.aud);
    if (claims.data.exp !== undefined) this.assertNotExpired(claims.data.exp);
    return {
      type: claims.data.events.type,
      appleUserId: claims.data.events.sub,
    };
  }

  /** 서명을 검증하고 payload 를 돌려준다. 알고리즘은 RS256 으로 고정한다 */
  private async verifySignature(token: string): Promise<unknown> {
    const decoded = decodeJws(token);
    if (!decoded || decoded.header.alg !== "RS256" || !decoded.header.kid) {
      throw new UnauthorizedException("malformed apple token");
    }

    const keys = await this.fetchKeys();
    const jwk = keys.find(
      (key) => key.kid === decoded.header.kid && key.kty === "RSA",
    );
    if (!jwk) throw new UnauthorizedException("unknown apple signing key");

    let valid: boolean;
    try {
      valid = verifyRs256(decoded, jwk);
    } catch {
      throw new BadGatewayException("apple returned an unusable signing key");
    }
    if (!valid)
      throw new UnauthorizedException("invalid apple token signature");
    return decoded.payload;
  }

  private assertAudience(aud: string | string[]): void {
    const audiences = typeof aud === "string" ? [aud] : aud;
    if (!audiences.includes(this.clientId)) {
      throw new UnauthorizedException("apple token issued for another app");
    }
  }

  private assertNotExpired(expSeconds: number): void {
    if (expSeconds * 1000 <= Date.now()) {
      throw new UnauthorizedException("apple token expired");
    }
  }

  private async fetchKeys(): Promise<z.infer<typeof appleJwksSchema>["keys"]> {
    let response: Response;
    try {
      response = await fetch(APPLE_KEYS_URL, {
        signal: AbortSignal.timeout(APPLE_TIMEOUT_MS),
      });
    } catch {
      throw new BadGatewayException("apple keys unreachable");
    }
    if (!response.ok) {
      throw new BadGatewayException(`apple keys error: ${response.status}`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new BadGatewayException("apple keys returned non-json response");
    }
    const parsed = appleJwksSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadGatewayException("apple keys returned unexpected response");
    }
    return parsed.data.keys;
  }
}
