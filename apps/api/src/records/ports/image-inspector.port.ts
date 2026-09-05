export const IMAGE_INSPECTOR = Symbol("ImageInspector");

/** 저장을 허용하는 포맷 — 클라이언트가 재인코딩해 올린다 (docs/11 §3.1) */
export type AllowedImageFormat = "image/jpeg" | "image/webp";

export interface InspectedImage {
  mimeType: AllowedImageFormat;
  width: number;
  height: number;
}

/** 검증 실패 사유 — 서비스가 HTTP 상태로 번역한다 */
export type ImageRejection =
  | "NOT_AN_IMAGE"
  | "UNSUPPORTED_FORMAT"
  | "TOO_LARGE_DIMENSIONS"
  | "HAS_METADATA";

export class ImageRejected extends Error {
  constructor(readonly reason: ImageRejection) {
    super(reason);
  }
}

/**
 * 업로드 이미지 검증 outbound port.
 *
 * MIME 문자열을 믿지 않고 실제 바이트를 디코딩해 포맷·크기를 확인하고,
 * **위치 메타데이터(EXIF·XMP·GPS)가 하나라도 있으면 거부**한다 (docs/11 §3.1).
 * 클라이언트가 재인코딩으로 이미 제거하지만, 누락을 대비한 이중 안전장치다.
 */
export interface ImageInspector {
  /** 통과하면 확정된 포맷·크기를 돌려주고, 아니면 ImageRejected 를 던진다 */
  inspect(data: Buffer): Promise<InspectedImage>;
}
