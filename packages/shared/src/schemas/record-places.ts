import { z } from "zod";
import { entryDateSchema } from "./records";

/**
 * 방문 관광지 저장·지도 진행률 계약 (docs/16-visit-region-api-design.md).
 *
 * 서버에는 **사용자가 직접 확정한 결과만** 도달해야 한다. 좌표·EXIF·매칭 경위는 계약에 없고,
 * `areaCode`·`sigunguCode`·`categoryCode` 는 클라이언트를 믿지 않고 서버가 KTO 상세에서 뽑는다.
 *
 * 그래서 요청 스키마는 `.strict()` 다 — zod 기본값(strip)은 모르는 키를 조용히 버려서
 * "좌표를 보내면 거부한다" 가 성립하지 않는다 (docs/16 §4.2).
 */

/** TourAPI contentId — 숫자 형식만 받는다 */
export const ktoContentIdSchema = z.string().regex(/^\d+$/);

/**
 * POST /records/:recordId/places
 *
 * `visitedAt` 은 date-only 다. datetime 으로 두면 같은 날 같은 곳이 시각 차이로 다른 행이 되어
 * 중복 제약이 무력해지고, 타임존 때문에 지도 집계가 하루씩 어긋난다 (docs/16 §2.1).
 */
export const createRecordPlaceSchema = z
  .object({
    contentId: ktoContentIdSchema,
    visitedAt: entryDateSchema,
  })
  .strict();
export type CreateRecordPlaceInput = z.infer<typeof createRecordPlaceSchema>;

/** PATCH /records/:recordId/places/:placeId — 두 필드 모두 선택이되 최소 하나는 있어야 한다 */
export const updateRecordPlaceSchema = z
  .object({
    contentId: ktoContentIdSchema.optional(),
    visitedAt: entryDateSchema.optional(),
  })
  .strict()
  .refine(
    (patch) => patch.contentId !== undefined || patch.visitedAt !== undefined,
    "contentId 또는 visitedAt 중 하나는 있어야 합니다",
  );
export type UpdateRecordPlaceInput = z.infer<typeof updateRecordPlaceSchema>;

/** 방문 관광지 응답 — 저장된 식별자와 코드만 담는다. 관광지명·주소는 TourAPI 로 실시간 결합한다 */
export const recordPlaceSchema = z.object({
  id: z.string().min(1),
  recordId: z.string().min(1),
  contentId: z.string().min(1),
  areaCode: z.string().min(1),
  sigunguCode: z.string().nullable(),
  categoryCode: z.string().nullable(),
  /** `YYYY-MM-DD` */
  visitedAt: z.string().min(1),
  /** ISO 8601 */
  createdAt: z.string().min(1),
});
export type RecordPlace = z.infer<typeof recordPlaceSchema>;

/**
 * GET /map/progress 의 지역 항목.
 * `@tripic/shared` 의 `RegionProgress` 타입과 같은 모양을 유지한다 — 웹이 이미 그 타입을 쓴다.
 */
export const regionProgressSchema = z.object({
  id: z.string().min(1),
  areaCode: z.string().min(1),
  visitCount: z.number().int().nonnegative(),
  /** `YYYY-MM-DD` */
  firstVisitedAt: z.string().min(1).optional(),
  lastVisitedAt: z.string().min(1).optional(),
});

export const mapProgressResponseSchema = z.object({
  visitedAreaCount: z.number().int().nonnegative(),
  totalAreaCount: z.number().int().positive(),
  recordedPlaceCount: z.number().int().nonnegative(),
  regions: z.array(regionProgressSchema),
});
export type MapProgressResponse = z.infer<typeof mapProgressResponseSchema>;
