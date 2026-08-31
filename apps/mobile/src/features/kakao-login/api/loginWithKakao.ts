import {
  kakaoLoginResultSchema,
  kakaoLoginSchema,
  type KakaoLoginResult,
} from "@tripic/shared";

import { requestKakaoAccessToken } from "@/features/kakao-login/lib/kakaoGateway";
import { requestJson } from "@/shared/api";

export async function loginWithKakao(): Promise<KakaoLoginResult> {
  const kakaoAccessToken = await requestKakaoAccessToken();
  const body = kakaoLoginSchema.parse({ kakaoAccessToken });
  const response = await requestJson("/auth/kakao", {
    auth: false,
    body,
    method: "POST",
  });

  return kakaoLoginResultSchema.parse(response);
}
