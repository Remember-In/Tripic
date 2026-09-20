import { ServiceUnavailableException } from "@nestjs/common";
import type {
  KakaoAuthClient,
  KakaoCodeExchange,
} from "@/auth/ports/kakao-auth-client.port";

/**
 * 카카오 웹 env 를 비운 서버에서 code 교환 포트 자리에 연결하는 adapter (docs/15 §2).
 * 웹 카카오 로그인만 503 으로 막히고, 네이티브 `/auth/kakao` 는 그대로 동작한다.
 * 서비스 코드는 설정 여부를 알 필요가 없다.
 */
export class DisabledKakaoWebLoginAdapter implements KakaoAuthClient {
  async exchangeAuthorizationCode(
    _input: KakaoCodeExchange,
  ): Promise<{ kakaoAccessToken: string }> {
    throw new ServiceUnavailableException("kakao web login is not configured");
  }
}
