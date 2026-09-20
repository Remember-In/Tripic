import { beforeEach, describe, expect, it } from "vitest";
import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { IS_PUBLIC_KEY } from "@/auth/public.decorator";
import type {
  NewRefreshToken,
  RefreshTokens,
  StoredRefreshToken,
} from "@/auth/ports/refresh-tokens.port";

const SECRET = "0123456789abcdef0123456789abcdef";
const USER = "user-1";
const FAMILY = "family-1";

/** 살아 있는 family 만 기억하는 in-memory fake (CLAUDE.md: mock 대신 fake) */
class FakeRefreshTokens implements RefreshTokens {
  live = new Map<string, string>([[FAMILY, USER]]);
  lookups: string[] = [];

  async findByHash(): Promise<StoredRefreshToken | null> {
    return null;
  }
  async issue(_token: NewRefreshToken): Promise<void> {}
  async rotate(): Promise<boolean> {
    return true;
  }
  async revokeFamily(familyId: string): Promise<void> {
    this.live.delete(familyId);
  }
  async revokeAllForUser(userId: string): Promise<void> {
    for (const [family, owner] of this.live) {
      if (owner === userId) this.live.delete(family);
    }
  }
  async findActiveByFamily(familyId: string) {
    this.lookups.push(familyId);
    const userId = this.live.get(familyId);
    return userId ? { userId } : null;
  }
}

/**
 * Authorization 헤더만 흉내내는 최소 실행 컨텍스트.
 * Reflector 가 메타데이터를 읽으므로 handler·class 는 실제 함수·클래스여야 한다.
 */
class StubController {}
const stubHandler = function handler() {};

const contextOf = (header?: string): ExecutionContext => {
  const request: { headers: { authorization?: string }; userId?: string } = {
    headers: header ? { authorization: header } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => stubHandler,
    getClass: () => StubController,
  } as unknown as ExecutionContext;
};

describe("JwtAuthGuard", () => {
  let jwt: JwtService;
  let tokens: FakeRefreshTokens;
  let guard: JwtAuthGuard;

  const sign = (payload: Record<string, unknown>) => jwt.signAsync(payload);

  beforeEach(() => {
    jwt = new JwtService({ secret: SECRET });
    tokens = new FakeRefreshTokens();
    guard = new JwtAuthGuard(jwt, new Reflector(), tokens);
  });

  it("살아 있는 세션의 토큰은 통과시킨다", async () => {
    const token = await sign({ sub: USER, fam: FAMILY });

    await expect(guard.canActivate(contextOf(`Bearer ${token}`))).resolves.toBe(
      true,
    );
  });

  it("Bearer 토큰이 없으면 401", async () => {
    await expect(guard.canActivate(contextOf())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("서명이 다른 토큰은 401", async () => {
    const other = new JwtService({ secret: "f".repeat(32) });
    const token = await other.signAsync({ sub: USER, fam: FAMILY });

    await expect(
      guard.canActivate(contextOf(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  /**
   * 이게 이 가드의 핵심이다 — 서명만 보면 로그아웃·탈퇴 뒤에도 최대 15분 통과한다.
   */
  it("로그아웃으로 family 가 revoke 되면 즉시 401", async () => {
    const token = await sign({ sub: USER, fam: FAMILY });
    await tokens.revokeFamily(FAMILY);

    await expect(
      guard.canActivate(contextOf(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("탈퇴로 행이 사라지면 즉시 401", async () => {
    const token = await sign({ sub: USER, fam: FAMILY });
    // hard delete → cascade 로 refresh_tokens 행이 사라진 상태와 같다
    tokens.live.clear();

    await expect(
      guard.canActivate(contextOf(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("family 를 담지 않은 구 토큰은 401 — 배포 시 재로그인을 강제한다", async () => {
    const token = await sign({ sub: USER });

    await expect(
      guard.canActivate(contextOf(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("남의 family 를 붙인 토큰은 401", async () => {
    tokens.live.set("family-2", "user-2");
    const token = await sign({ sub: USER, fam: "family-2" });

    await expect(
      guard.canActivate(contextOf(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("@Public() 라우트는 조회 없이 통과한다 — 쿼터를 쓰지 않는다", async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = <T>(key: unknown): T =>
      (key === IS_PUBLIC_KEY) as T;
    const publicGuard = new JwtAuthGuard(jwt, reflector, tokens);

    await expect(publicGuard.canActivate(contextOf())).resolves.toBe(true);
    expect(tokens.lookups).toEqual([]);
  });
});
