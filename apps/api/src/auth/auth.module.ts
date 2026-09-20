import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import {
  selectAppleAuthClient,
  selectAppleIdentityVerifier,
  selectProviderTokenCipher,
} from "@/auth/apple-adapters";
import { AppleAuthService } from "@/auth/apple-auth.service";
import { AuthController } from "@/auth/auth.controller";
import { AuthService } from "@/auth/auth.service";
import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { APPLE_AUTH_CLIENT } from "@/auth/ports/apple-auth-client.port";
import { APPLE_CREDENTIALS } from "@/auth/ports/apple-credentials.port";
import { APPLE_IDENTITY_VERIFIER } from "@/auth/ports/apple-identity-verifier.port";
import { KAKAO_VERIFIER } from "@/auth/ports/kakao-verifier.port";
import { AUTH_ACCOUNTS } from "@/auth/ports/auth-accounts.port";
import { PROVIDER_TOKEN_CIPHER } from "@/auth/ports/provider-token-cipher.port";
import { REFRESH_TOKENS } from "@/auth/ports/refresh-tokens.port";
import { SESSION_ISSUER } from "@/auth/ports/session-issuer.port";
import { KakaoApiAdapter } from "@/auth/adapters/kakao-api.adapter";
import { PrismaAppleCredentialsAdapter } from "@/auth/adapters/prisma-apple-credentials.adapter";
import { PrismaAuthAccountsAdapter } from "@/auth/adapters/prisma-auth-accounts.adapter";
import { PrismaRefreshTokensAdapter } from "@/auth/adapters/prisma-refresh-tokens.adapter";
import { readAppleConfig } from "@/config/apple-config";
import type { Env } from "@/config/env";
import { SOCIAL_ACCOUNT_UNLINKER } from "@/users/ports/social-account-unlinker.port";

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get("JWT_ACCESS_SECRET", { infer: true }),
        signOptions: {
          expiresIn: config.get("JWT_ACCESS_TTL_SEC", { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AppleAuthService,
    { provide: SESSION_ISSUER, useExisting: AuthService },
    // outbound ports → adapters (확장은 provider 교체로)
    { provide: KAKAO_VERIFIER, useClass: KakaoApiAdapter },
    { provide: AUTH_ACCOUNTS, useClass: PrismaAuthAccountsAdapter },
    { provide: REFRESH_TOKENS, useClass: PrismaRefreshTokensAdapter },
    // Apple env 가 없으면 비활성 adapter 가 붙어 Apple 기능만 503 이 된다 (docs/14 §7.1)
    {
      provide: APPLE_IDENTITY_VERIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        selectAppleIdentityVerifier(readAppleConfig(config)),
    },
    {
      provide: APPLE_AUTH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        selectAppleAuthClient(readAppleConfig(config)),
    },
    {
      provide: PROVIDER_TOKEN_CIPHER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        selectProviderTokenCipher(readAppleConfig(config)),
    },
    { provide: APPLE_CREDENTIALS, useClass: PrismaAppleCredentialsAdapter },
    // users 모듈이 정의한 탈퇴 전 연결 해제 port 를 Apple 유스케이스가 구현한다 (docs/14 §6)
    { provide: SOCIAL_ACCOUNT_UNLINKER, useExisting: AppleAuthService },
    // 전역 default-deny: @Public() 이 없는 모든 라우트는 Bearer 인증 필요
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, SOCIAL_ACCOUNT_UNLINKER],
})
export class AuthModule {}
