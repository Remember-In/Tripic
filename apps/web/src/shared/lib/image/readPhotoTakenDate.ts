type ExifDates = {
  CreateDate?: Date;
  DateTimeOriginal?: Date;
  ModifyDate?: Date;
};

function toLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 위치 태그는 요청하지 않고 촬영일 후보만 읽는다. */
export async function readPhotoTakenDate(file: File) {
  try {
    const { parse } = await import("exifr");
    const metadata = (await parse(file, [
      "DateTimeOriginal",
      "CreateDate",
      "ModifyDate",
    ])) as ExifDates | undefined;
    const takenAt =
      metadata?.DateTimeOriginal ??
      metadata?.CreateDate ??
      metadata?.ModifyDate;
    if (!(takenAt instanceof Date) || Number.isNaN(takenAt.getTime())) {
      return null;
    }

    const year = takenAt.getFullYear();
    if (year < 1900 || year > new Date().getFullYear() + 1) return null;
    return toLocalDateInput(takenAt);
  } catch {
    // EXIF가 없거나 지원하지 않는 포맷이어도 사진 선택 자체는 허용한다.
    return null;
  }
}
