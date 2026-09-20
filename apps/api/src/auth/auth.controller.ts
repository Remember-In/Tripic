import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import {
  appleLoginSchema,
  appleNotificationSchema,
  kakaoLoginSchema,
  refreshTokenSchema,
  type AppleLoginInput,
  type AppleNotificationInput,
  type KakaoLoginInput,
  type RefreshTokenInput,
} from "@tripic/shared";
import { AppleAuthService } from "@/auth/apple-auth.service";
import { AuthService } from "@/auth/auth.service";
import { CurrentUser } from "@/auth/current-user.decorator";
import { Public } from "@/auth/public.decorator";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly apple: AppleAuthService,
  ) {}

  /** POST /auth/kakao — 카카오 access token 교환 로그인/가입 (201) */
  @Public()
  @Post("kakao")
  loginWithKakao(
    @Body(new ZodValidationPipe(kakaoLoginSchema)) body: KakaoLoginInput,
  ) {
    return this.auth.loginWithKakao(body.kakaoAccessToken);
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
