/**
 * Tripic 공통 타입 (PRD 13장 최소 로컬 데이터 모델 기반)
 *
 * 주의:
 * - 이 타입들은 앱/서버가 공유하는 "계약(contract)"이다.
 * - 관광공사 OpenAPI 원천 데이터(관광지명/주소/소개/이미지 등)는 저장 대상이 아니므로
 *   여기서 모델링하지 않는다. (PRD 6.3 / 12.2 준수)
 */

/** 방문지 매칭 방식 (PRD 6.5) */
export type MatchMethod =
  | "GPS_CANDIDATE"
  | "MANUAL_SEARCH"
  | "MANUAL_REGION_SELECT";

/** 매칭 신뢰도 (PRD 6.4) */
export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW" | "MANUAL";

/** 로컬 사진 참조 (PRD 13. LocalPhoto) */
export interface LocalPhoto {
  id: string;
  /** 사진 라이브러리 참조 ID */
  localAssetId: string;
  /** 촬영일시 (ISO 8601) */
  takenAt?: string;
  /** GPS 존재 여부 (좌표 자체는 저장하지 않음) */
  hasGps: boolean;
  createdAt: string;
}

/** 방문 기록 (PRD 13. VisitRecord) */
export interface VisitRecord {
  id: string;
  localPhotoId: string;
  /** 관광공사 contentId */
  contentId: string;
  /** 방문일시 (ISO 8601) */
  visitedAt: string;
  /** 관광공사 지역코드 */
  areaCode: string;
  /** 시군구코드 (선택) */
  sigunguCode?: string;
  /** 관광 유형 코드 (선택) */
  categoryCode?: string;
  matchMethod: MatchMethod;
  matchConfidence: MatchConfidence;
  userConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** 지역별 진행률 (PRD 13. RegionProgress) */
export interface RegionProgress {
  id: string;
  areaCode: string;
  visitCount: number;
  firstVisitedAt?: string;
  lastVisitedAt?: string;
}

/** 사용자 메모 (PRD 13. UserMemo) */
export interface UserMemo {
  id: string;
  visitRecordId: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

/** 뱃지 진행률 (PRD 13. BadgeProgress, P1) */
export interface BadgeProgress {
  id: string;
  badgeKey: string;
  earned: boolean;
  earnedAt?: string;
}
