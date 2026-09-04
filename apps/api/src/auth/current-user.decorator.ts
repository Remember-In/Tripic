import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/** guard/데코레이터가 사용하는 요청 형태 (express Request 의 구조적 부분집합) */
export interface AuthenticatedRequest {
  headers: { authorization?: string };
  /** JwtAuthGuard 가 검증한 access token 의 sub */
  userId: string;
}

/** 인증된 라우트에서 현재 사용자 id를 주입한다 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().userId,
);
