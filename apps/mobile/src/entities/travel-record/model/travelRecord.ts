import type { ImageSourcePropType } from "react-native";

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
