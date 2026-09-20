import {
  DEFAULT_TOURISM_LIST_LIMIT,
  MAX_TOURISM_LIST_LIMIT,
} from "@tripic/shared";
import { z } from "zod";

/** TourAPI contentId — 경로 파라미터라 숫자 형식만 통과시킨다 */
export const contentIdSchema = z.string().regex(/^\d+$/);

/**
 * 후보 개수 — 클라이언트가 보낸 값을 1..50 으로 좁힌다.
 * 쿼리스트링은 문자열이라 coerce 가 필요하다.
 */
const limitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(MAX_TOURISM_LIST_LIMIT)
  .default(DEFAULT_TOURISM_LIST_LIMIT);

/**
 * GET /tourism/search 쿼리 — 사용자가 직접 입력한 키워드로 찾는다 (docs/15 §4.4).
 *
 * 좌표(mapX·mapY)는 받지 않는다. 서버가 좌표를 수신하는 순간 위치정보법 신고 요부 판단이
 * 달라지므로, 스키마에 넣지 않아 실수로 라우트가 생기지 않게 한다 (docs/12 §3-②-1).
 */
export const tourismSearchQuerySchema = z.object({
  keyword: z.string().trim().min(1),
  limit: limitSchema,
});
export type TourismSearchQuery = z.infer<typeof tourismSearchQuerySchema>;

/**
 * GET /tourism/places 쿼리 — 시·도(필수)와 시·군·구(선택)로 찾는다 (docs/15 §4.4).
 * 키워드 검색은 `/tourism/search` 로 분리돼 있다.
 */
export const tourismPlacesQuerySchema = z.object({
  areaCode: z.string().trim().min(1),
  sigunguCode: z.string().trim().min(1).optional(),
  limit: limitSchema,
});
export type TourismPlacesQuery = z.infer<typeof tourismPlacesQuerySchema>;
