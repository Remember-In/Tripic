import type {
  LocalRecordDay,
  LocalTravelRecord,
} from "@/entities/travel-record";

export function removeRecordPhoto(
  record: LocalTravelRecord,
  dayId: string,
  photoId: string,
): readonly LocalRecordDay[] {
  return record.days.flatMap((day) => {
    if (day.id !== dayId) {
      return [day];
    }

    const photos = day.photos.filter((photo) => photo.id !== photoId);
    const visits = day.visits.filter((visit) => visit.photoId !== photoId);
    const hasRemainingContent =
      photos.length > 0 || visits.length > 0 || Boolean(day.note?.trim());

    return hasRemainingContent ? [{ ...day, photos, visits }] : [];
  });
}
