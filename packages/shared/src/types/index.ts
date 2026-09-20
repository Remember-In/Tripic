/**
 * Tripic 공통 타입 (PRD 13장 최소 로컬 데이터 모델 기반)
 *
 * 주의:
 * - 이 타입들은 앱/서버가 공유하는 "계약(contract)"이다.
 * - 관광공사 OpenAPI 원천 데이터(관광지명/주소/소개/이미지 등)는 저장 대상이 아니므로
 *   여기서 모델링하지 않는다. (PRD 6.3 / 12.2 준수)
 * - 상대 경로에 확장자를 붙이지 않는다: 이 패키지는 CommonJS 로 빌드해 서버(Node)와
 *   모바일(Metro) 양쪽이 같은 소스 규칙을 쓰도록 맞췄다.
 */

import type { DiaryStyle, EntrySource, RecordTheme } from "../schemas/records";

/** 방문지 매칭 방식 (PRD 6.5) */
export type MatchMethod =
  "GPS_CANDIDATE" | "MANUAL_SEARCH" | "MANUAL_REGION_SELECT";

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

/* ---------- 비위치성 운영 API 응답 계약 (docs/13-operations-api-design.md) ----------
 * 서버는 DB 없이 정적 상수로 서빙하고 값 변경은 재배포로 처리한다.
 * 요청 본문이 없으므로 zod 스키마가 아닌 **응답 타입**이 계약의 본체다. */

/** GET /version — 앱 최소 지원 버전 */
export interface VersionInfo {
  /** semver — 미만이면 앱이 강제 업데이트를 안내한다 */
  minSupportedVersion: string;
  latestVersion: string;
  /** 스토어 등록 전까지는 필드 자체를 생략한다 (빈 문자열 금지) */
  updateUrl?: {
    android?: string;
    ios?: string;
  };
}

/** GET /app-config — 앱 동작 설정 (비위치성, PRD 6.4) */
export interface AppConfig {
  /** 관광지 후보 조회 기준 — 릴리스 없이 조정 가능하게 원격화 */
  kto: {
    defaultRadiusM: number;
    maxRadiusM: number;
    maxCandidates: number;
  };
  /** 미구현/미승인 기능의 앱 노출 차단 스위치 */
  features: {
    aiDiary: boolean;
    photoUpload: boolean;
    /** 서버에 Apple 설정이 있어 Apple 로그인이 가능한지 (docs/14 §7.1) */
    appleLogin: boolean;
  };
}

/** GET /notices — 공지 (publishedAt 내림차순) */
export interface Notice {
  id: string;
  title: string;
  /** plain text 또는 markdown */
  body: string;
  /** ISO 8601 */
  publishedAt: string;
}

/* ---------- 여행 기록 콘텐츠 응답 계약 (docs/11-records-api-design.md §3) ----------
 * 요청 스키마와 enum 은 schemas/records.ts 에 있다 (zod). 여기는 응답 형태만 둔다.
 * 방문 관광지(record_places)는 위치정보지원센터 검토 후 별도 추가한다. */

/** 목록·생성·수정 응답 */
export interface RecordSummary {
  id: string;
  title: string;
  theme: RecordTheme | null;
  style: DiaryStyle | null;
  hashtags: string[];
  /** 일기가 있는 일차 수 */
  entryCount: number;
  /** 내용이 있는 일차의 최소 날짜 `YYYY-MM-DD`. 없으면 null */
  startDate: string | null;
  /** 최대 날짜 `YYYY-MM-DD`. 없으면 null */
  endDate: string | null;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

/** 날짜별 일기 (없는 일차는 null) */
export interface RecordEntry {
  content: string;
  source: EntrySource;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

/** 상세 응답의 일차 — 일기와 사진은 날짜를 공유하는 형제 관계 */
export interface RecordDay {
  /** `YYYY-MM-DD` */
  date: string;
  entry: RecordEntry | null;
  /** 해당 일차의 사진 — 바이트가 아니라 서빙 경로만 담긴다 (docs/11 §3.1) */
  photos: RecordPhoto[];
}

export interface RecordPhoto {
  id: string;
  /** 바이너리 서빙 경로 */
  url: string;
}

/** 상세 응답 — RecordSummary 에서 entryCount 대신 days (날짜 오름차순) */
export interface RecordDetail {
  id: string;
  title: string;
  theme: RecordTheme | null;
  style: DiaryStyle | null;
  hashtags: string[];
  days: RecordDay[];
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}
