import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import {
  appleLoginSchema,
  appleNotificationSchema,
  kakaoLoginSchema,
  kakaoWebLoginSchema,
  refreshTokenSchema,
  type AppleLoginInput,
  type AppleNotificationInput,
  type KakaoLoginInput,
  type KakaoWebLoginInput,
  type RefreshTokenInput,
} from "@tripic/shared";
import { AppleAuthService } from "@/auth/apple-auth.service";
import { AuthService } from "@/auth/auth.service";
import { CurrentUser } from "@/auth/current-user.decorator";
import { Public } from "@/auth/public.decorator";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";
import type { Env } from "@/config/env";

const WEB_REFRESH_COOKIE = "tripic_refresh";

function readCookie(request: Request, name: string) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly apple: AppleAuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie(WEB_REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      maxAge:
        this.config.get("JWT_REFRESH_TTL_DAYS", { infer: true }) *
        24 *
        60 *
        60 *
        1000,
      path: "/api/auth",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  /** POST /auth/kakao — 카카오 access token 교환 로그인/가입 (201) */
  @Public()
  @Post("kakao")
  loginWithKakao(
    @Body(new ZodValidationPipe(kakaoLoginSchema)) body: KakaoLoginInput,
  ) {
    return this.auth.loginWithKakao(body.kakaoAccessToken);
  }

  /** 웹 OAuth code 로그인 — refresh token은 HttpOnly cookie에만 저장한다. */
  @Public()
  @Post("kakao/web")
  async loginWithKakaoWeb(
    @Body(new ZodValidationPipe(kakaoWebLoginSchema)) body: KakaoWebLoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...result } =
      await this.auth.loginWithKakaoCode(body);
    this.setRefreshCookie(response, refreshToken);
    return result;
  }

  /** POST /auth/apple — Apple identity token 검증 + code 교환 로그인/가입 (201, docs/14 §3) */
  @Public()
  @Post("apple")
  loginWithApple(
    @Body(new ZodValidationPipe(appleLoginSchema)) body: AppleLoginInput,
  ) {
    return this.apple.loginWithApple(body);
  }

  /** POST /auth/apple/notifications — Apple 서버 알림. 인증은 Apple 서명 검증 (200, docs/14 §4) */
  @Public()
  @Post("apple/notifications")
  @HttpCode(200)
  async receiveAppleNotification(
    @Body(new ZodValidationPipe(appleNotificationSchema))
    body: AppleNotificationInput,
  ): Promise<void> {
    await this.apple.handleNotification(body.payload);
  }

  /** POST /auth/refresh — 토큰 rotation (200) */
  @Public()
  @Post("refresh")
  @HttpCode(200)
  refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenInput,
  ) {
    return this.auth.refresh(body.refreshToken);
  }

  /** 웹 refresh — cookie rotation 후 access token만 본문으로 반환한다. */
  @Public()
  @Post("refresh/web")
  @HttpCode(200)
  async refreshWeb(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const current = readCookie(request, WEB_REFRESH_COOKIE);
    if (!current) throw new UnauthorizedException("refresh cookie required");
    const { refreshToken, ...result } = await this.auth.refresh(current);
    this.setRefreshCookie(response, refreshToken);
    return result;
  }

  /** POST /auth/logout — family 전체 revoke (204) */
  @Post("logout")
  @HttpCode(204)
  async logout(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenInput,
  ) {
    await this.auth.logout(userId, body.refreshToken);
  }

  /** 웹 로그아웃 — refresh family를 폐기하고 cookie를 제거한다. */
  @Post("logout/web")
  @HttpCode(204)
  async logoutWeb(
    @CurrentUser() userId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = readCookie(request, WEB_REFRESH_COOKIE);
    if (refreshToken) await this.auth.logout(userId, refreshToken);
    response.clearCookie(WEB_REFRESH_COOKIE, {
      path: "/api/auth",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
}
