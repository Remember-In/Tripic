import type { ConfigService } from "@nestjs/config";
import type { Env } from "@/config/env";

/** Apple 연동 adapter 가 쓰는 설정 묶음 (docs/14 §7) */
export interface AppleConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  /** .p8 PEM — env 검증 단계에서 줄바꿈 복원·EC 키 확인을 마친 값 */
  privateKey: string;
  /** base64 32바이트 — Apple refresh token 암호화 키 */
  tokenEncryptionKey: string;
}

/**
 * Apple env 5종을 설정 묶음으로 읽는다. 전부 비운 서버면 null — Apple 로그인 비활성 (docs/14 §7.1).
 * 일부만 설정한 경우는 env 검증이 부팅 단계에서 이미 막는다.
 */
export function readAppleConfig(
  config: ConfigService<Env, true>,
): AppleConfig | null {
  const clientId = config.get("APPLE_CLIENT_ID", { infer: true });
  const teamId = config.get("APPLE_TEAM_ID", { infer: true });
  const keyId = config.get("APPLE_KEY_ID", { infer: true });
  const privateKey = config.get("APPLE_PRIVATE_KEY", { infer: true });
  const tokenEncryptionKey = config.get("SOCIAL_TOKEN_ENCRYPTION_KEY", {
    infer: true,
  });
  if (!clientId || !teamId || !keyId || !privateKey || !tokenEncryptionKey) {
    return null;
  }
  return { clientId, teamId, keyId, privateKey, tokenEncryptionKey };
}
