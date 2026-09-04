import type { Notice } from "@tripic/shared";

/**
 * 공지 목록 (docs/13-operations-api-design.md §2).
 * DB 없이 상수로 서빙한다 — 공지 추가/수정 = 재배포.
 *
 * 서비스 오픈 등 실제 공지 문구는 릴리스 시점에 이 배열에 추가한다.
 */
const NOTICE_ENTRIES: Notice[] = [];

/** 응답 계약이 publishedAt 내림차순이므로 정렬은 데이터 모듈이 보장한다 */
export const NOTICES: readonly Notice[] = NOTICE_ENTRIES.toSorted((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);
