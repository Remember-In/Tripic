import { z } from "zod";

/**
 * 한국관광공사 TourAPI 프록시(`/tourism`) 응답 계약 (docs/15 §4).
 * 서버와 웹이 같은 스키마로 검증한다.
 *
 * 여기는 **프록시가 중계하는 형태**만 둔다 — 서버는 이 데이터를 저장하지 않으므로
 * `packages/shared/src/types/index.ts` 의 영속 모델에는 넣지 않는다.
 * 타입 이름은 모바일 사본(`apps/mobile/src/shared/api/kto/types.ts`)과 맞춰,
 * 나중에 모바일을 프록시로 전환할 때 rename 이 없게 한다.
 */
export const ktoListItemSchema = z.object({
  address: z.string(),
  areaCode: z.string(),
  categoryCode: z.string().optional(),
  contentId: z.string().min(1),
  contentTypeId: z.string().optional(),
  imageUrl: z.string().optional(),
  legalAreaCode: z.string().optional(),
  legalSigunguCode: z.string().optional(),
  sigunguCode: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  title: z.string().min(1),
});
export type KtoListItem = z.infer<typeof ktoListItemSchema>;

export const ktoPlaceDetailSchema = ktoListItemSchema.extend({
  homepage: z.string().optional(),
  overview: z.string().optional(),
  telephone: z.string().optional(),
});
export type KtoPlaceDetail = z.infer<typeof ktoPlaceDetailSchema>;

export const ktoImageSchema = z.object({
  contentId: z.string().min(1),
  originalUrl: z.string().min(1),
  thumbnailUrl: z.string().optional(),
});
export type KtoImage = z.infer<typeof ktoImageSchema>;

export const ktoAreaSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
});
export type KtoArea = z.infer<typeof ktoAreaSchema>;

/** 후보 목록 상한 — 클라이언트가 더 큰 값을 보내도 여기서 잘린다 */
export const MAX_TOURISM_LIST_LIMIT = 50;
export const DEFAULT_TOURISM_LIST_LIMIT = 5;
