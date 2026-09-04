import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const recordPhotoDirectoryName = "tripic-record-photos";

function recordPhotoDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error("앱 전용 사진 저장소를 사용할 수 없습니다.");
  }

  return `${FileSystem.documentDirectory}${recordPhotoDirectoryName}`;
}

function safeFileId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-120);
}

export function durablePhotoUri(photoId: string) {
  return `${recordPhotoDirectory()}/${safeFileId(photoId)}.jpg`;
}

/**
 * 선택한 이미지를 다시 인코딩해 EXIF가 포함되지 않은 앱 전용 JPEG 사본을 만든다.
 * 반환 URI만 SQLite에 저장하며 원본 사진과 GPS 좌표는 저장하지 않는다.
 */
export async function createDurablePhotoCopy(
  sourceUri: string,
  photoId: string,
  dimensions?: { height: number; width: number },
) {
  const directory = recordPhotoDirectory();
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const longestEdge = Math.max(dimensions?.height ?? 0, dimensions?.width ?? 0);
  const resizeAction =
    longestEdge > 2_048 && dimensions
      ? [
          {
            resize:
              dimensions.width >= dimensions.height
                ? { width: 2_048 }
                : { height: 2_048 },
          },
        ]
      : [];
  const rendered = await manipulateAsync(sourceUri, resizeAction, {
    compress: 0.94,
    format: SaveFormat.JPEG,
  });
  const destination = durablePhotoUri(photoId);

  try {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    await FileSystem.copyAsync({ from: rendered.uri, to: destination });
    return destination;
  } catch (error) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    throw error;
  } finally {
    await FileSystem.deleteAsync(rendered.uri, { idempotent: true });
  }
}

export async function deleteDurablePhoto(uri: string) {
  const directory = recordPhotoDirectory();

  if (!uri.startsWith(`${directory}/`)) {
    return;
  }

  await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function deleteAllDurablePhotos() {
  await FileSystem.deleteAsync(recordPhotoDirectory(), { idempotent: true });
}
