import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  appleLoginSchema,
  appleNotificationSchema,
  kakaoLoginSchema,
  kakaoWebLoginSchema,
  refreshTokenSchema,
  type AppleLoginInput,
  type AppleNotificationInput,
  type AuthTokens,
  type KakaoLoginInput,
  type KakaoWebLoginInput,
  type RefreshTokenInput,
  type WebAuthTokens,
  type WebSocialLoginResult,
} from "@tripic/shared";
import { ConfigService } from "@nestjs/config";
import type { CookieOptions } from "express";
import {
  REFRESH_COOKIE_CLEAR_OPTIONS,
  REFRESH_COOKIE_NAME,
  readRefreshCookie,
  refreshCookieOptions,
  shouldClearRefreshCookie,
} from "@/auth/web-session-cookie";
import type { Env } from "@/config/env";
import { AppleAuthService } from "@/auth/apple-auth.service";
import { AuthService } from "@/auth/auth.service";
import { CurrentUser } from "@/auth/current-user.decorator";
import { Public } from "@/auth/public.decorator";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";

@Controller("auth")
export class AuthController {
  /** 쿠키 수명은 refresh token 수명과 같아야 한다 — 어긋나면 한쪽만 먼저 죽는다 */
  private readonly refreshCookie: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    private readonly apple: AppleAuthService,
    config: ConfigService<Env, true>,
  ) {
    this.refreshCookie = refreshCookieOptions(
      config.get("JWT_REFRESH_TTL_DAYS", { infer: true }),
    );
  }

  /** POST /auth/kakao — 카카오 access token 교환 로그인/가입 (201) */
  @Public()
  @Post("kakao")
  loginWithKakao(
    @Body(new ZodValidationPipe(kakaoLoginSchema)) body: KakaoLoginInput,
  ) {
    return this.auth.loginWithKakao(body.kakaoAccessToken);
  }

  /**
   * POST /auth/kakao/web — 웹 카카오 로그인 (201, docs/15 §2).
   * refresh token 은 본문이 아니라 HttpOnly 쿠키로만 내려간다 — 웹은 저장할 안전한 곳이 없다.
   */
  @Public()
  @Post("kakao/web")
  async loginWithKakaoWeb(
    @Body(new ZodValidationPipe(kakaoWebLoginSchema)) body: KakaoWebLoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WebSocialLoginResult> {
    const { refreshToken, ...session } =
      await this.auth.loginWithKakaoWebCode(body);
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, this.refreshCookie);
    return session;
  }

  /** POST /auth/refresh/web — 쿠키의 refresh token 을 rotation (200, docs/15 §3) */
  @Public()
  @Post("refresh/web")
  @HttpCode(200)
  async refreshWeb(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WebAuthTokens> {
    const presented = readRefreshCookie(request.headers.cookie);
    if (!presented) {
      response.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_CLEAR_OPTIONS);
      throw new UnauthorizedException("missing refresh token");
    }

    let rotated: AuthTokens;
    try {
      rotated = await this.auth.refresh(presented);
    } catch (error) {
      if (shouldClearRefreshCookie(error)) {
        response.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_CLEAR_OPTIONS);
      }
      throw error;
    }

    const { refreshToken, ...tokens } = rotated;
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, this.refreshCookie);
    return tokens;
  }

  /**
   * POST /auth/logout/web — 쿠키의 refresh token family 를 revoke (204, docs/15 §3).
   * 쿠키 유무와 관계없이 지우고 204 로 끝낸다 — 로그아웃은 멱등해야 한다.
   * 남의 토큰으로는 끊지 못한다(소유권 검사는 AuthService.logout 이 한다).
   */
  @Post("logout/web")
  @HttpCode(204)
  async logoutWeb(
    @CurrentUser() userId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const presented = readRefreshCookie(request.headers.cookie);
    if (presented) {
      await this.auth.logout(userId, presented);
    }
    response.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_CLEAR_OPTIONS);
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

  /** POST /auth/logout — family 전체 revoke (204) */
  @Post("logout")
  @HttpCode(204)
  async logout(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenInput,
  ) {
    await this.auth.logout(userId, body.refreshToken);
  }
}
