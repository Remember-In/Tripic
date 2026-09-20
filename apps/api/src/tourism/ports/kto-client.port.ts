import type {
  KtoArea,
  KtoImage,
  KtoListItem,
  KtoPlaceDetail,
} from "@tripic/shared";

export const KTO_CLIENT = Symbol("KtoClient");

export interface KtoAreaFilter {
  areaCode: string;
  sigunguCode?: string;
}

/**
 * 한국관광공사 TourAPI(KorService2) outbound port (docs/15 §4).
 *
 * 순수 조회다 — 응답을 DB·캐시·로그 어디에도 남기지 않는다.
 * **좌표 기반 주변검색은 제공하지 않는다.** 좌표가 서버에 닿는 순간
 * 위치정보법 신고 요부 판단이 달라진다 (docs/12 §3-②-1, docs/15 §4.2).
 *
 * 실패는 Nest 예외 의미론을 따른다:
 * 상류 오류 → 502, 타임아웃 → 504, 서비스키 미설정 → 503.
 */
export interface KtoClient {
  searchByKeyword(
    keyword: string,
    limit: number,
  ): Promise<readonly KtoListItem[]>;
  findByArea(
    filter: KtoAreaFilter,
    limit: number,
  ): Promise<readonly KtoListItem[]>;
  findDetail(contentId: string): Promise<KtoPlaceDetail | null>;
  findImages(contentId: string): Promise<readonly KtoImage[]>;
  listAreas(): Promise<readonly KtoArea[]>;
}
