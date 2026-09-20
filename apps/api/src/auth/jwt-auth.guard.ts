import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "@/auth/public.decorator";
import {
  REFRESH_TOKENS,
  type RefreshTokens,
} from "@/auth/ports/refresh-tokens.port";
import type { AuthenticatedRequest } from "@/auth/current-user.decorator";

/**
 * 전역 default-deny guard — `@Public()` 라우트만 인증 없이 통과.
 *
 * 서명 검증만으로는 부족하다. access token 은 서버가 지울 수 없는 15분짜리 JWT 라,
 * 로그아웃·탈퇴 뒤에도 그대로 통과해 버린다. 그래서 토큰에 담긴 rotation family 가
 * 아직 살아 있는지 매 요청 확인한다 (docs/10 §3):
 *
 * - 로그아웃 → `revokeFamily` 로 family 가 죽어 401
 * - 탈퇴     → hard delete 의 cascade 로 행이 사라져 401
 *
 * `@@index([familyId])` 를 타는 단일 조회이고, `@Public()` 라우트는 조회조차 하지 않는다.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @Inject(REFRESH_TOKENS) private readonly tokens: RefreshTokens,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException("missing bearer token");

    let payload: { sub?: string; fam?: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: string; fam?: string }>(
        token,
      );
    } catch {
      throw new UnauthorizedException("invalid or expired access token");
    }

    // fam 이 없는 토큰은 이 검사가 생기기 전에 발급된 것이다 — 재로그인을 강제한다
    if (!payload.sub || !payload.fam) {
      throw new UnauthorizedException("invalid or expired access token");
    }

    const session = await this.tokens.findActiveByFamily(payload.fam);
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException("session is no longer active");
    }

    request.userId = payload.sub;
    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(" ");
    return scheme?.toLowerCase() === "bearer" && token ? token : null;
  }
}
