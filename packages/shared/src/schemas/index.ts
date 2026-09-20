/**
 * Tripic 공통 스키마 (PRD 11.1)
 *
 * 런타임 검증이 필요한 앱/서버 계약은 zod 스키마로 여기에 둔다.
 * 관광공사 OpenAPI 응답 전문 저장용 모델은 만들지 않는다 —
 * `./tourism` 은 저장 모델이 아니라 프록시가 중계하는 형태의 계약이다 (docs/15 §4).
 */
export * from "./auth";
export * from "./records";
export * from "./tourism";
