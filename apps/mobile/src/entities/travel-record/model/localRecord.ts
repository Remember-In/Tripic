import type { MatchConfidence, MatchMethod } from "@tripic/shared";

import type { DiaryStyle, RecordTheme } from "./recordContract";

export const GUEST_LOCAL_RECORD_OWNER_KEY = "guest" as const;

export type LocalRecordOwnerKey =
  typeof GUEST_LOCAL_RECORD_OWNER_KEY | `user:${string}`;

export type LocalRecordPhotoInput = {
  id: string;
  /** 기기 사진 라이브러리의 자산 ID. */
  localAssetId?: string | null;
  /** 앱 sandbox에 보관된 로컬 파일 URI. 원격 이미지 URL은 허용하지 않는다. */
  localUri?: string | null;
};

export type LocalRecordVisitInput = {
  areaCode: string;
  categoryCode?: string | null;
  contentId: string;
  id: string;
  matchConfidence: MatchConfidence;
  matchMethod: MatchMethod;
  photoId?: string | null;
  sigunguCode?: string | null;
  /** ISO 8601 방문 시각. 생략하면 해당 일자의 자정(UTC)으로 정규화한다. */
  visitedAt?: string;
};

export type LocalRecordDayInput = {
  date: string;
  id: string;
  note?: string | null;
  photos: readonly LocalRecordPhotoInput[];
  visits: readonly LocalRecordVisitInput[];
};

export type CreateLocalTravelRecordInput = {
  days: readonly LocalRecordDayInput[];
  id: string;
  ownerKey: LocalRecordOwnerKey;
  style?: DiaryStyle | null;
  tags?: readonly string[];
  theme?: RecordTheme | null;
  title: string;
};

export type UpdateLocalTravelRecordInput = Omit<
  CreateLocalTravelRecordInput,
  "ownerKey"
>;

export type LocalRecordPhoto = {
  id: string;
  localAssetId: string | null;
  localUri: string | null;
};

export type LocalRecordVisit = {
  areaCode: string;
  categoryCode: string | null;
  contentId: string;
  createdAt: string;
  id: string;
  matchConfidence: MatchConfidence;
  matchMethod: MatchMethod;
  photoId: string | null;
  sigunguCode: string | null;
  updatedAt: string;
  userConfirmed: true;
  visitedAt: string;
};

export type LocalRecordDay = {
  date: string;
  id: string;
  note: string | null;
  photos: readonly LocalRecordPhoto[];
  visits: readonly LocalRecordVisit[];
};

export type LocalTravelRecord = {
  createdAt: string;
  days: readonly LocalRecordDay[];
  id: string;
  ownerKey: LocalRecordOwnerKey;
  style: DiaryStyle | null;
  tags: readonly string[];
  theme: RecordTheme | null;
  title: string;
  updatedAt: string;
};

export type LocalTravelRecordSummary = {
  areaCodes: readonly string[];
  createdAt: string;
  dayCount: number;
  endDate: string | null;
  id: string;
  ownerKey: LocalRecordOwnerKey;
  photoCount: number;
  startDate: string | null;
  style: DiaryStyle | null;
  tags: readonly string[];
  theme: RecordTheme | null;
  title: string;
  updatedAt: string;
  visitCount: number;
};

export type LocalRegionProgress = {
  areaCode: string;
  firstVisitedAt: string;
  lastVisitedAt: string;
  sigunguCode: string | null;
  visitCount: number;
};

export type LocalRegionProgressScope = "area" | "sigungu";

export type LocalRecordStats = {
  photoCount: number;
  recordCount: number;
  visitedAreaCount: number;
  visitedPlaceCount: number;
  visitedSigunguCount: number;
};

export function createUserLocalRecordOwnerKey(
  userId: string,
): LocalRecordOwnerKey {
  const normalizedUserId = userId.trim();

  if (normalizedUserId.length === 0) {
    throw new Error("사용자 ID는 비어 있을 수 없습니다.");
  }

  return `user:${normalizedUserId}`;
}
