import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "@/auth/auth.controller";
import { AuthService } from "@/auth/auth.service";
import { JwtAuthGuard } from "@/auth/jwt-auth.guard";
import { KAKAO_VERIFIER } from "@/auth/ports/kakao-verifier.port";
import { AUTH_ACCOUNTS } from "@/auth/ports/auth-accounts.port";
import { REFRESH_TOKENS } from "@/auth/ports/refresh-tokens.port";
import { KakaoApiAdapter } from "@/auth/adapters/kakao-api.adapter";
import { PrismaAuthAccountsAdapter } from "@/auth/adapters/prisma-auth-accounts.adapter";
import { PrismaRefreshTokensAdapter } from "@/auth/adapters/prisma-refresh-tokens.adapter";
import type { Env } from "@/config/env";

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
    // outbound ports → adapters (확장은 provider 교체로)
    { provide: KAKAO_VERIFIER, useClass: KakaoApiAdapter },
    { provide: AUTH_ACCOUNTS, useClass: PrismaAuthAccountsAdapter },
    { provide: REFRESH_TOKENS, useClass: PrismaRefreshTokensAdapter },
    // 전역 default-deny: @Public() 이 없는 모든 라우트는 Bearer 인증 필요
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
