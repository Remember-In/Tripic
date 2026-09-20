import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InternalServerErrorException } from "@nestjs/common";
import { AesGcmTokenCipherAdapter } from "@/auth/adapters/aes-gcm-token-cipher.adapter";

const cipherWithKey = (key: Buffer) =>
  new AesGcmTokenCipherAdapter(key.toString("base64"));

describe("AesGcmTokenCipherAdapter", () => {
  const cipher = cipherWithKey(randomBytes(32));

  it("암호화한 값을 복호화하면 원문이 나온다", () => {
    const sealed = cipher.encrypt("apple-refresh-token");

    expect(cipher.decrypt(sealed)).toBe("apple-refresh-token");
  });

  it("저장 형식은 v1.<iv>.<authTag>.<ciphertext> 이고 원문을 포함하지 않는다", () => {
    const sealed = cipher.encrypt("apple-refresh-token");

    expect(sealed).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(sealed).not.toContain("apple-refresh-token");
  });

  it("같은 원문도 매번 다른 암호문이 된다 (IV 재사용 없음)", () => {
    expect(cipher.encrypt("same")).not.toBe(cipher.encrypt("same"));
  });

  it("암호문이 변조되면 500 — GCM 무결성 검증", () => {
    const [version, iv, tag, ciphertext = ""] = cipher
      .encrypt("apple-refresh-token")
      .split(".");
    const flipped = Buffer.from(ciphertext, "base64url");
    flipped[0] = (flipped[0] ?? 0) ^ 0xff;
    const tampered = [version, iv, tag, flipped.toString("base64url")].join(
      ".",
    );

    expect(() => cipher.decrypt(tampered)).toThrow(
      InternalServerErrorException,
    );
  });

  it("다른 키로는 복호화할 수 없다 — 500", () => {
    const sealed = cipher.encrypt("apple-refresh-token");

    expect(() => cipherWithKey(randomBytes(32)).decrypt(sealed)).toThrow(
      InternalServerErrorException,
    );
  });

  it("암호문이 온전해도 버전 접두사가 v1 이 아니면 복호화하지 않는다 — 키 교체 규칙 (docs/14 §5)", () => {
    const relabeled = cipher
      .encrypt("apple-refresh-token")
      .replace(/^v1\./, "v2.");

    expect(() => cipher.decrypt(relabeled)).toThrow(
      InternalServerErrorException,
    );
  });

  it("알 수 없는 버전·형식이면 500", () => {
    expect(() => cipher.decrypt("v2.a.b.c")).toThrow(
      InternalServerErrorException,
    );
    expect(() => cipher.decrypt("plain-token")).toThrow(
      InternalServerErrorException,
    );
  });
});
