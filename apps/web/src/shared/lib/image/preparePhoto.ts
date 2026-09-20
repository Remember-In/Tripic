const MAX_DIMENSION = 2048;
const MAX_UPLOAD_BYTES = 1024 * 1024;

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
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size <= MAX_UPLOAD_BYTES) return blob;
  }

  throw new Error("사진 용량을 1MB 이하로 줄이지 못했습니다.");
}
