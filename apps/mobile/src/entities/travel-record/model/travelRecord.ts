import type { ImageSourcePropType } from "react-native";

import {
  gyeongjuWorldPhoto,
  recordPhotoSources,
} from "@/shared/assets/record-flow";

import type { DiaryStyle, RecordTheme } from "./recordContract";

export type RecordFilter = "recent" | "region";

export type TravelRecordSummary = {
  dateRange: string;
  id: string;
  /** Phase 3 record-places data is not part of the records content API. */
  regions?: string;
  title: string;
};

export type ItineraryDay = {
  date: string;
  day: number;
  id: string;
  note?: string;
  photos: readonly ImageSourcePropType[];
};

export type VisitedPlace = {
  address: string;
  category: string;
  id: string;
  name: string;
  photo: ImageSourcePropType;
  region: string;
  stampApplied: boolean;
  visitDate: string;
};

export type TravelRecord = {
  days: readonly ItineraryDay[];
  id: string;
  place: VisitedPlace;
  style?: DiaryStyle | null;
  tags: readonly string[];
  theme?: RecordTheme | null;
  title: string;
};

export const travelRecordSummaries: readonly TravelRecordSummary[] = [
  {
    dateRange: "2026.07.22-23",
    id: "gyeongju",
    regions: "경상북도 경주시",
    title: "경주 여행",
  },
  {
    dateRange: "2026.03.24-04.01",
    id: "family-date",
    regions: "광주광역시, 전라북도 전주시",
    title: "엄마와 데이트",
  },
  {
    dateRange: "2026.02.18",
    id: "daegu",
    regions: "대구광역시",
    title: "대구 한바퀴",
  },
] as const;

const gyeongjuDays: readonly ItineraryDay[] = [
  { date: "2026.07.22", day: 1, id: "day-1", photos: recordPhotoSources },
  { date: "2026.07.23", day: 2, id: "day-2", photos: recordPhotoSources },
  { date: "2026.07.24", day: 3, id: "day-3", photos: recordPhotoSources },
] as const;

export const recordTagOptions = [
  "#여행발자국",
  "#나의 여행지도",
  "#발자국챌린지",
  "#지도채우기",
  "#맛집기행",
  "#대한민국한바퀴",
  "#여행",
  "#숨은명소",
  "#경주",
] as const;

export const gyeongjuTravelRecord: TravelRecord = {
  days: gyeongjuDays,
  id: "gyeongju",
  place: {
    address: "경상북도 경주시 보문로 544",
    category: "액티비티",
    id: "gyeongju-world",
    name: "경주월드",
    photo: gyeongjuWorldPhoto,
    region: "경주",
    stampApplied: true,
    visitDate: "2026.05.18",
  },
  tags: ["#여행발자국", "#맛집기행"],
  title: "경주 여행",
};

const travelRecordsById: Readonly<Record<string, TravelRecord>> =
  Object.fromEntries(
    travelRecordSummaries.map((summary) => [
      summary.id,
      {
        ...gyeongjuTravelRecord,
        id: summary.id,
        title: summary.title,
      },
    ]),
  );

export function getTravelRecord(recordId: string): TravelRecord {
  return travelRecordsById[recordId] ?? gyeongjuTravelRecord;
}
