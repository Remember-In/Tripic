import type { SocialLoginResult } from "@tripic/shared";
import type { AuthAccount } from "@/auth/ports/auth-accounts.port";

export const SESSION_ISSUER = Symbol("SessionIssuer");

/** 소셜 계정 확인이 끝난 사용자에게 Tripic 세션(access + refresh)을 발급하는 port */
export interface SessionIssuer {
  startSession(
    account: AuthAccount,
    isNewUser: boolean,
  ): Promise<SocialLoginResult>;
}
