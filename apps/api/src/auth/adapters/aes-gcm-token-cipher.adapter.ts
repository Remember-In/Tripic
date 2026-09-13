import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { InternalServerErrorException } from "@nestjs/common";
import type { ProviderTokenCipher } from "@/auth/ports/provider-token-cipher.port";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

/** AES-256-GCM 암복호화 adapter — 저장 형식 `v1.<iv>.<authTag>.<ciphertext>` (docs/14 §5) */
export class AesGcmTokenCipherAdapter implements ProviderTokenCipher {
  private readonly key: Buffer;

  /** @param encodedKey base64 32바이트 — env 검증을 통과한 SOCIAL_TOKEN_ENCRYPTION_KEY */
  constructor(encodedKey: string) {
    this.key = Buffer.from(encodedKey, "base64");
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_BYTES,
    });
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return [
      VERSION,
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  decrypt(sealed: string): string {
    const [version, iv, authTag, ciphertext, ...rest] = sealed.split(".");
    if (
      version !== VERSION ||
      !iv ||
      !authTag ||
      ciphertext === undefined ||
      rest.length > 0
    ) {
      throw new InternalServerErrorException("unsupported sealed token format");
    }

    try {
      const decipher = createDecipheriv(
        ALGORITHM,
        this.key,
        Buffer.from(iv, "base64url"),
        { authTagLength: AUTH_TAG_BYTES },
      );
      decipher.setAuthTag(Buffer.from(authTag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      // 키가 바뀌었거나 암호문이 변조됨 — 복구할 수 없는 설정 장애로 취급한다
      throw new InternalServerErrorException("sealed token decryption failed");
    }
  }
}
