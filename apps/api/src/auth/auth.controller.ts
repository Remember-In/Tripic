import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import {
  kakaoLoginSchema,
  refreshTokenSchema,
  type KakaoLoginInput,
  type RefreshTokenInput,
} from "@tripic/shared";
import { AuthService } from "@/auth/auth.service";
import { CurrentUser } from "@/auth/current-user.decorator";
import { Public } from "@/auth/public.decorator";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/kakao — 카카오 access token 교환 로그인/가입 (201) */
  @Public()
  @Post("kakao")
  loginWithKakao(
    @Body(new ZodValidationPipe(kakaoLoginSchema)) body: KakaoLoginInput,
  ) {
    return this.auth.loginWithKakao(body.kakaoAccessToken);
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
