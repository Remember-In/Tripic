export const RECORD_PLACES = Symbol("RecordPlaces");

/** 서버가 KTO 상세에서 검증해 채운 값 — 클라이언트 입력을 그대로 쓰지 않는다 (docs/16 §2.1) */
export interface NewRecordPlace {
  ktoContentId: string;
  /** `YYYY-MM-DD` */
  visitedAt: string;
  areaCode: string;
  sigunguCode: string | null;
  categoryCode: string | null;
}

export interface RecordPlacePatch {
  ktoContentId?: string;
  visitedAt?: string;
  areaCode?: string;
  sigunguCode?: string | null;
  categoryCode?: string | null;
}

/** 저장된 방문 관광지 — 응답 계약(`recordPlaceSchema`)과 같은 모양 */
export interface StoredRecordPlace {
  id: string;
  recordId: string;
  contentId: string;
  areaCode: string;
  sigunguCode: string | null;
  categoryCode: string | null;
  /** `YYYY-MM-DD` */
  visitedAt: string;
  /** ISO 8601 */
  createdAt: string;
}

/** 지역별 집계 한 줄 — `record_places` 를 조회 시점에 집계한다 (진행률 테이블을 두지 않는다) */
export interface RegionVisitTally {
  areaCode: string;
  visitCount: number;
  /** `YYYY-MM-DD` */
  firstVisitedAt: string;
  lastVisitedAt: string;
}

/**
 * 방문 관광지 영속성 outbound port (docs/16).
 *
 * `RecordsRepository` 와 분리한 이유는 ISP 다 — 기록·일기·사진 유스케이스는 방문 관광지를
 * 알 필요가 없고, 한 인터페이스에 모으면 범용 repository 가 된다 (apps/api/CLAUDE.md).
 *
 * 소유권은 모든 메서드가 `userId` 를 받아 port 계약 안에서 거른다.
 * 타인의 자원은 "없음" 으로 돌려주고, 404 번역은 서비스가 한다.
 */
export interface RecordPlaces {
  /** 소유한 기록이 아니면 null. 같은 기록·관광지·방문일이 이미 있으면 `"DUPLICATE"` */
  add(
    userId: string,
    recordId: string,
    place: NewRecordPlace,
  ): Promise<StoredRecordPlace | "DUPLICATE" | null>;

  /** 소유한 기록이 아니면 null (빈 배열과 구분한다) */
  listByRecord(
    userId: string,
    recordId: string,
  ): Promise<StoredRecordPlace[] | null>;

  /** 수정 대상이 없거나 타인 소유면 null. 중복이 되면 `"DUPLICATE"` */
  update(
    userId: string,
    recordId: string,
    placeId: string,
    patch: RecordPlacePatch,
  ): Promise<StoredRecordPlace | "DUPLICATE" | null>;

  /** 지운 행이 없으면 false */
  remove(userId: string, recordId: string, placeId: string): Promise<boolean>;

  /** 사용자의 모든 방문 관광지를 areaCode 로 집계한다 (오름차순) */
  tallyRegions(userId: string): Promise<RegionVisitTally[]>;
}
