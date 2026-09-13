import {
  createPublicKey,
  sign,
  verify,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";
import { z } from "zod";

/** Apple 이 서명한 JWT 의 발급자이자 Apple REST API 의 base URL */
export const APPLE_ISSUER = "https://appleid.apple.com";

/**
 * Apple 연동에 필요한 최소한의 JWS 처리 (docs/14 §3). 외부 JWT 라이브러리 없이 node:crypto 만 쓴다.
 * 알고리즘은 호출하는 쪽이 고정한다 — 토큰 헤더의 `alg` 를 신뢰해 알고리즘을 고르지 않는다.
 */

const jwsHeaderSchema = z.object({
  alg: z.string(),
  kid: z.string().optional(),
});

export interface DecodedJws {
  header: z.infer<typeof jwsHeaderSchema>;
  payload: unknown;
  signingInput: string;
  signature: Buffer;
}

const encodeSegment = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

/** JSON 파싱 실패는 undefined — zod 검증에서 형식 오류로 걸리게 한다 */
export const parseJsonOrUndefined = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** compact JWS 를 서명 검증 없이 분해한다. 형식이 틀리면 null */
export function decodeJws(token: string): DecodedJws | null {
  const segments = token.split(".");
  if (segments.length !== 3) return null;
  const [headerSegment = "", payloadSegment = "", signatureSegment = ""] =
    segments;
  if (!headerSegment || !payloadSegment || !signatureSegment) return null;

  const header = jwsHeaderSchema.safeParse(
    parseJsonOrUndefined(
      Buffer.from(headerSegment, "base64url").toString("utf8"),
    ),
  );
  const payload = parseJsonOrUndefined(
    Buffer.from(payloadSegment, "base64url").toString("utf8"),
  );
  if (!header.success || payload === undefined) return null;

  return {
    header: header.data,
    payload,
    signingInput: `${headerSegment}.${payloadSegment}`,
    signature: Buffer.from(signatureSegment, "base64url"),
  };
}

/** RSA 공개키 JWK 로 RS256 서명을 검증한다. 키 형식이 틀리면 예외 */
export function verifyRs256(
  decoded: DecodedJws,
  jwk: { n: string; e: string },
): boolean {
  const key: JsonWebKey = { kty: "RSA", n: jwk.n, e: jwk.e };
  const publicKey = createPublicKey({ key, format: "jwk" });
  return verify(
    "RSA-SHA256",
    Buffer.from(decoded.signingInput),
    publicKey,
    decoded.signature,
  );
}

/** ES256 compact JWS 서명 — JOSE 규격대로 DER 이 아닌 r||s(IEEE P1363) 서명을 쓴다 */
export function signEs256(
  header: Record<string, string>,
  payload: Record<string, string | number>,
  privateKey: KeyObject,
): string {
  const signingInput = `${encodeSegment({ ...header, alg: "ES256" })}.${encodeSegment(payload)}`;
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${signature.toString("base64url")}`;
}
