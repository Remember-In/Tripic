import {
  DEFAULT_TOURISM_LIST_LIMIT,
  MAX_TOURISM_LIST_LIMIT,
} from "@tripic/shared";
import { z } from "zod";

/** TourAPI contentId — 경로 파라미터라 숫자 형식만 통과시킨다 */
export const contentIdSchema = z.string().regex(/^\d+$/);

const optionalTrimmed = z.string().trim().min(1).optional().catch(undefined);

/**
 * GET /tourism/places 쿼리 (docs/15 §4).
 *
 * keyword 와 areaCode 는 **배타적**이다 — 한 라우트에 둘 다 오면 어느 쪽을 쓸지 모호해지고,
 * 라우트를 나누면 `/places/:contentId` 와 선언 순서로 충돌한다.
 *
 * 좌표(mapX·mapY)는 받지 않는다. 서버가 좌표를 수신하는 순간 위치정보법 신고 요부 판단이
 * 달라지므로, 스키마에 넣지 않아 실수로 라우트가 생기지 않게 한다 (docs/12 §3-②-1).
 */
export const tourismPlacesQuerySchema = z
  .object({
    keyword: optionalTrimmed,
    areaCode: optionalTrimmed,
    sigunguCode: optionalTrimmed,
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_TOURISM_LIST_LIMIT)
      .default(DEFAULT_TOURISM_LIST_LIMIT),
  })
  .superRefine((query, ctx) => {
    if (query.keyword && query.areaCode) {
      ctx.addIssue({
        code: "custom",
        message: "keyword and areaCode cannot be used together",
      });
    }
    if (!query.keyword && !query.areaCode) {
      ctx.addIssue({
        code: "custom",
        message: "either keyword or areaCode is required",
      });
    }
    if (query.sigunguCode && !query.areaCode) {
      ctx.addIssue({
        code: "custom",
        message: "sigunguCode requires areaCode",
      });
    }
  });

export type TourismPlacesQuery = z.infer<typeof tourismPlacesQuerySchema>;
