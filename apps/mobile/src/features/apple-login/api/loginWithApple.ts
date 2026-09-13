import {
  appleLoginSchema,
  socialLoginResultSchema,
  type SocialLoginResult,
} from "@tripic/shared";

import { requestAppleCredential } from "@/features/apple-login/lib/appleGateway";
import { requestJson } from "@/shared/api";

export async function loginWithApple(): Promise<SocialLoginResult> {
  const credential = await requestAppleCredential();
  const body = appleLoginSchema.parse(credential);
  const response = await requestJson("/auth/apple", {
    auth: false,
    body,
    method: "POST",
  });

  return socialLoginResultSchema.parse(response);
}
