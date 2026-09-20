import { describe, expect, it, vi } from "vitest";
import type { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import type { AppleAuthService } from "@/auth/apple-auth.service";
import { AuthController } from "@/auth/auth.controller";
import type { AuthService } from "@/auth/auth.service";
import type { Env } from "@/config/env";

const loginResult = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresIn: 900,
  isNewUser: false,
  user: { id: "user-1", nickname: "여행자" },
};

function setup() {
  const auth = {
    loginWithKakaoCode: vi.fn().mockResolvedValue(loginResult),
    refresh: vi.fn().mockResolvedValue({
      accessToken: "rotated-access",
      refreshToken: "rotated-refresh",
      expiresIn: 900,
    }),
    logout: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuthService;
  const response = {
    clearCookie: vi.fn(),
    cookie: vi.fn(),
  } as unknown as Response;
  const config = {
    get: vi.fn().mockReturnValue(30),
  } as unknown as ConfigService<Env, true>;
  const controller = new AuthController(auth, {} as AppleAuthService, config);
  return { auth, controller, response };
}

describe("AuthController web session", () => {
  it("로그인 응답 본문에서 refresh token을 제거하고 HttpOnly cookie로 설정한다", async () => {
    const { controller, response } = setup();
    const result = await controller.loginWithKakaoWeb(
      {
        code: "code",
        redirectUri: "https://tripic.example/auth/kakao/callback",
        restApiKey: "rest-key",
      },
      response,
    );

    expect(result).not.toHaveProperty("refreshToken");
    expect(response.cookie).toHaveBeenCalledWith(
      "tripic_refresh",
      "refresh-token",
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });

  it("refresh cookie를 회전하고 access token만 반환한다", async () => {
    const { auth, controller, response } = setup();
    const request = {
      headers: { cookie: "tripic_refresh=current-refresh" },
    } as Request;

    const result = await controller.refreshWeb(request, response);

    expect(auth.refresh).toHaveBeenCalledWith("current-refresh");
    expect(result).toEqual({ accessToken: "rotated-access", expiresIn: 900 });
    expect(response.cookie).toHaveBeenCalledWith(
      "tripic_refresh",
      "rotated-refresh",
      expect.any(Object),
    );
  });

  it("로그아웃하면 refresh family와 cookie를 모두 제거한다", async () => {
    const { auth, controller, response } = setup();
    const request = {
      headers: { cookie: "tripic_refresh=current-refresh" },
    } as Request;

    await controller.logoutWeb("user-1", request, response);

    expect(auth.logout).toHaveBeenCalledWith("user-1", "current-refresh");
    expect(response.clearCookie).toHaveBeenCalledWith(
      "tripic_refresh",
      expect.objectContaining({ path: "/api/auth" }),
    );
  });
});
