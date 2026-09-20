import { Injectable } from "@nestjs/common";
import sharp from "sharp";
import {
  ImageRejected,
  type AllowedImageFormat,
  type ImageInspector,
  type InspectedImage,
} from "@/records/ports/image-inspector.port";

/** decompression bomb 방어 — 픽셀 수와 변 길이를 모두 제한한다 (docs/11 §3.1) */
const MAX_DIMENSION_PX = 4096;
const MAX_PIXELS = MAX_DIMENSION_PX * MAX_DIMENSION_PX;

const FORMAT_TO_MIME: Record<string, AllowedImageFormat> = {
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/**
 * sharp(libvips) 기반 이미지 검증 어댑터.
 *
 * metadata() 는 헤더만 읽지 않고 실제 디코더를 통과시키므로 손상된 파일도 걸러진다.
 * limitInputPixels 로 거대한 픽셀 폭탄은 디코딩 전에 거부된다.
 */
@Injectable()
export class SharpImageInspectorAdapter implements ImageInspector {
  async inspect(data: Buffer): Promise<InspectedImage> {
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(data, { limitInputPixels: MAX_PIXELS }).metadata();
    } catch {
      // 이미지가 아니거나 디코딩 불가 — 픽셀 제한 초과도 여기로 온다
      throw new ImageRejected("NOT_AN_IMAGE");
    }

    const mimeType = metadata.format
      ? FORMAT_TO_MIME[metadata.format]
      : undefined;
    if (!mimeType) throw new ImageRejected("UNSUPPORTED_FORMAT");

    const { width, height } = metadata;
    if (!width || !height) throw new ImageRejected("NOT_AN_IMAGE");
    if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
      throw new ImageRejected("TOO_LARGE_DIMENSIONS");
    }

    // 위치 메타데이터가 남아 있으면 거부한다. exif/xmp 는 GPS 를 직접 품고,
    // iptc/icc 는 위치는 아니지만 사본에 남을 이유가 없어 함께 막는다.
    if (metadata.exif || metadata.xmp || metadata.iptc || metadata.icc) {
      throw new ImageRejected("HAS_METADATA");
    }

    return { mimeType, width, height };
  }
}
