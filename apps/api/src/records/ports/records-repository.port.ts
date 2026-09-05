import type {
  DiaryStyle,
  EntrySource,
  RecordDetail,
  RecordSummary,
  RecordTheme,
} from "@tripic/shared";

export const RECORDS_REPOSITORY = Symbol("RecordsRepository");

/** 생성 입력 — 서비스가 기본값까지 채운 뒤 넘긴다 */
export interface NewRecord {
  userId: string;
  title: string;
  theme: RecordTheme | null;
  style: DiaryStyle | null;
  hashtags: string[];
}

/**
 * 부분 수정 입력.
 * 키가 없으면 그대로 두고, `theme`/`style` 이 null 이면 해제한다 (docs/11 §3).
 */
export interface RecordPatch {
  title?: string;
  theme?: RecordTheme | null;
  style?: DiaryStyle | null;
  hashtags?: string[];
}

export interface NewEntry {
  content: string;
  source: EntrySource;
}

/** 날짜별 일기 — 상세 응답의 days[].entry 와 같은 형태 */
export interface StoredEntry {
  content: string;
  source: EntrySource;
  createdAt: string;
  updatedAt: string;
}

/**
 * 저장할 사진 — 검증을 통과한 바이트만 넘어온다.
 * `Buffer<ArrayBuffer>` 로 좁혀 두면 서빙 시 StreamableFile 에 그대로 넘길 수 있다.
 */
export interface NewPhoto {
  data: Buffer<ArrayBuffer>;
  mimeType: string;
  size: number;
}

/** 서빙용 사진 — 바이너리와 타입 */
export interface StoredPhoto {
  id: string;
  data: Buffer<ArrayBuffer>;
  mimeType: string;
}

/** 할당량 검사용 사용량 (docs/11 §3.1) */
export interface PhotoUsage {
  /** 해당 기록의 사진 수 */
  recordPhotoCount: number;
  /** 사용자 전체 사진의 바이트 합 */
  userTotalBytes: number;
}

/**
 * 여행 기록 콘텐츠 영속화 outbound port.
 *
 * 모든 메서드는 **소유권(userId)을 계약에 포함**한다 — 타인의 기록은 존재를 숨기고
 * `null`/`false` 로 응답해 서비스가 404 로 변환한다 (docs/11 §1·§5).
 * 날짜는 `YYYY-MM-DD` 문자열로 주고받는다.
 */
export interface RecordsRepository {
  create(record: NewRecord): Promise<RecordSummary>;
  /** 여행일 기준 최근순 — endDate 내림차순, 없으면 createdAt 으로 대체 */
  listByUser(userId: string): Promise<RecordSummary[]>;
  findDetail(userId: string, recordId: string): Promise<RecordDetail | null>;
  /** 없거나 타인 소유면 null */
  update(
    userId: string,
    recordId: string,
    patch: RecordPatch,
  ): Promise<RecordSummary | null>;
  /** 삭제했으면 true, 없거나 타인 소유면 false */
  delete(userId: string, recordId: string): Promise<boolean>;
  /** 내 기록 전체 삭제 (설정의 "전체 기록 초기화") */
  deleteAllByUser(userId: string): Promise<void>;
  /** 같은 날짜에 다시 쓰면 교체한다 (UNIQUE(recordId, date)). 기록이 없으면 null */
  upsertEntry(
    userId: string,
    recordId: string,
    date: string,
    entry: NewEntry,
  ): Promise<StoredEntry | null>;
  /** 삭제했으면 true, 기록·일기가 없거나 타인 소유면 false */
  deleteEntry(userId: string, recordId: string, date: string): Promise<boolean>;

  /** 할당량 판단에 필요한 현재 사용량. 기록이 없거나 타인 소유면 null */
  photoUsage(userId: string, recordId: string): Promise<PhotoUsage | null>;
  /** 저장 후 사진 id 반환. 기록이 없거나 타인 소유면 null */
  addPhoto(
    userId: string,
    recordId: string,
    date: string,
    photo: NewPhoto,
  ): Promise<string | null>;
  /** 서빙용 조회. 없거나 타인 소유면 null */
  findPhoto(
    userId: string,
    recordId: string,
    date: string,
    photoId: string,
  ): Promise<StoredPhoto | null>;
  /** 삭제했으면 true, 없거나 타인 소유면 false */
  deletePhoto(
    userId: string,
    recordId: string,
    date: string,
    photoId: string,
  ): Promise<boolean>;
}
