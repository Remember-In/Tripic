import type { ImageSourcePropType } from "react-native";

import { getRegionByAreaCode } from "@/entities/region";
import type {
  LocalTravelRecord,
  LocalTravelRecordSummary,
  TravelRecord,
  TravelRecordSummary,
} from "@/entities/travel-record";

export type PlaceDisplayMetadata = {
  address?: string;
  category?: string;
  name?: string;
};

function displayDate(value: string) {
  return value.replaceAll("-", ".");
}

function localPhotoSource(localUri: string | null): ImageSourcePropType | null {
  return localUri ? { uri: localUri } : null;
}

export function mapLocalRecordSummaryToDisplay(
  record: LocalTravelRecordSummary,
): TravelRecordSummary {
  const startDate = record.startDate ? displayDate(record.startDate) : "";
  const endDate = record.endDate ? displayDate(record.endDate) : startDate;
  const regions = record.areaCodes
    .map((areaCode) => getRegionByAreaCode(areaCode)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    dateRange:
      startDate === endDate || !endDate
        ? startDate
        : `${startDate}-${endDate.slice(5)}`,
    id: record.id,
    regions: regions.join(", ") || "지역 정보 없음",
    title: record.title,
  };
}

export function mapLocalRecordToDisplay(
  record: LocalTravelRecord,
  metadata: PlaceDisplayMetadata = {},
): TravelRecord {
  const firstDay = record.days[0];
  const firstPhoto = firstDay?.photos[0];
  const firstVisit = firstDay?.visits[0];
  const region = getRegionByAreaCode(firstVisit?.areaCode);
  const photo = localPhotoSource(firstPhoto?.localUri ?? null) ?? { uri: "" };

  return {
    days: record.days.map((day, dayIndex) => ({
      date: displayDate(day.date),
      day: dayIndex + 1,
      id: day.id,
      note: day.note ?? undefined,
      photos: day.photos.flatMap((recordPhoto) => {
        const source = localPhotoSource(recordPhoto.localUri);
        return source ? [source] : [];
      }),
    })),
    id: record.id,
    place: {
      address: metadata.address || region?.name || "주소 정보 없음",
      category: metadata.category || firstVisit?.categoryCode || "관광지",
      id: firstVisit?.contentId ?? `record:${record.id}`,
      name:
        metadata.name ||
        (firstVisit ? `관광지 ${firstVisit.contentId}` : "방문 장소"),
      photo,
      region: region?.shortName ?? "지역",
      stampApplied: Boolean(firstVisit),
      visitDate: displayDate(
        firstVisit?.visitedAt.slice(0, 10) ?? firstDay?.date ?? "",
      ),
    },
    style: record.style,
    tags: record.tags,
    theme: record.theme,
    title: record.title,
  };
}
