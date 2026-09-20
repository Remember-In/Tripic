const MAX_DIMENSION = 2048;
const MAX_UPLOAD_BYTES = 1024 * 1024;

const JPEG_MARKER = 0xff;
const JPEG_START_OF_IMAGE = 0xd8;
const JPEG_START_OF_SCAN = 0xda;
const JPEG_END_OF_IMAGE = 0xd9;
const JPEG_COMMENT = 0xfe;
const JPEG_APP_MARKER_START = 0xe1;
const JPEG_APP_MARKER_END = 0xef;

function concatBytes(chunks: Uint8Array[]) {
  const byteLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(byteLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * JPEG의 픽셀 데이터는 유지하면서 선택적 APP1~APP15와 주석 구간을 제거한다.
 * Safari가 canvas 재인코딩 결과에 ICC(APP2) 등을 다시 붙이는 경우까지 차단한다.
 */
export function stripJpegMetadataBytes(bytes: Uint8Array) {
  if (
    bytes.length < 4 ||
    bytes[0] !== JPEG_MARKER ||
    bytes[1] !== JPEG_START_OF_IMAGE
  ) {
    throw new Error("변환된 사진이 올바른 JPEG 형식이 아닙니다.");
  }

  const chunks = [bytes.subarray(0, 2)];
  let offset = 2;

  while (offset < bytes.length) {
    const markerStart = offset;
    if (bytes[offset] !== JPEG_MARKER) {
      throw new Error("변환된 JPEG 구성을 확인하지 못했습니다.");
    }

    while (offset < bytes.length && bytes[offset] === JPEG_MARKER) offset += 1;
    if (offset >= bytes.length) {
      throw new Error("변환된 JPEG가 완전하지 않습니다.");
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === JPEG_START_OF_SCAN) {
      chunks.push(bytes.subarray(markerStart));
      return concatBytes(chunks);
    }
    if (marker === JPEG_END_OF_IMAGE) {
      chunks.push(bytes.subarray(markerStart, offset));
      return concatBytes(chunks);
    }

    const isStandaloneMarker =
      marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
    if (isStandaloneMarker) {
      chunks.push(bytes.subarray(markerStart, offset));
      continue;
    }

    if (offset + 2 > bytes.length) {
      throw new Error("변환된 JPEG 구간이 완전하지 않습니다.");
    }
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    const segmentEnd = offset + segmentLength;
    if (segmentLength < 2 || segmentEnd > bytes.length) {
      throw new Error("변환된 JPEG 구간 길이가 올바르지 않습니다.");
    }

    const isMetadata =
      (marker >= JPEG_APP_MARKER_START && marker <= JPEG_APP_MARKER_END) ||
      marker === JPEG_COMMENT;
    if (!isMetadata) chunks.push(bytes.subarray(markerStart, segmentEnd));
    offset = segmentEnd;
  }

  throw new Error("변환된 JPEG에 이미지 데이터가 없습니다.");
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("사진을 변환하지 못했습니다.")),
      "image/jpeg",
      quality,
    );
  });
}

async function removeJpegMetadata(blob: Blob) {
  const sanitized = stripJpegMetadataBytes(
    new Uint8Array(await blob.arrayBuffer()),
  );
  return new Blob([sanitized], { type: "image/jpeg" });
}

/** 원본 메타데이터를 복사하지 않고 픽셀만 새 JPEG로 만들어 1 MiB 이하로 줄인다. */
export async function preparePhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 선택할 수 있습니다.");
  }

  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("사진 변환을 지원하지 않는 브라우저입니다.");

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.86, 0.75, 0.64, 0.52, 0.42]) {
    const blob = await removeJpegMetadata(await canvasToBlob(canvas, quality));
    if (blob.size <= MAX_UPLOAD_BYTES) return blob;
  }

  throw new Error("사진 용량을 1MB 이하로 줄이지 못했습니다.");
}
