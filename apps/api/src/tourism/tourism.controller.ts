import { Controller, Get, Param, Query } from "@nestjs/common";
import type {
  KtoArea,
  KtoImage,
  KtoListItem,
  KtoPlaceDetail,
} from "@tripic/shared";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";
import {
  contentIdSchema,
  tourismPlacesQuerySchema,
  tourismSearchQuerySchema,
  type TourismPlacesQuery,
  type TourismSearchQuery,
} from "@/tourism/tourism.contract";
import { TourismService } from "@/tourism/tourism.service";

/**
 * 한국관광공사 TourAPI 프록시 (docs/15 §4).
 *
 * `@Public()` 을 붙이지 않는다 — 전역 default-deny 덕분에 인증이 필수가 되고,
 * 일일 쿼터가 있는 서비스키를 익명 호출에 열어두지 않는다.
 * 응답은 중계만 하고 저장하지 않는다.
 */
@Controller("tourism")
export class TourismController {
  constructor(private readonly tourism: TourismService) {}

  /** GET /tourism/areas — 시·도 목록 */
  @Get("areas")
  listAreas(): Promise<readonly KtoArea[]> {
    return this.tourism.listAreas();
  }

  /**
   * GET /tourism/search — 키워드 검색.
   * `places` 의 형제 경로라 `places/:contentId` 와 선언 순서로 충돌하지 않는다.
   */
  @Get("search")
  search(
    @Query(new ZodValidationPipe(tourismSearchQuerySchema))
    query: TourismSearchQuery,
  ): Promise<readonly KtoListItem[]> {
    return this.tourism.search(query);
  }

  /** GET /tourism/places — 시·도(필수)와 시·군·구(선택)로 찾는다 */
  @Get("places")
  findPlaces(
    @Query(new ZodValidationPipe(tourismPlacesQuerySchema))
    query: TourismPlacesQuery,
  ): Promise<readonly KtoListItem[]> {
    return this.tourism.findPlaces(query);
  }

  /** GET /tourism/places/:contentId — 상세 (없으면 404) */
  @Get("places/:contentId")
  findDetail(
    @Param("contentId", new ZodValidationPipe(contentIdSchema))
    contentId: string,
  ): Promise<KtoPlaceDetail> {
    return this.tourism.findDetail(contentId);
  }

  /** GET /tourism/places/:contentId/images — 이미지 목록 */
  @Get("places/:contentId/images")
  findImages(
    @Param("contentId", new ZodValidationPipe(contentIdSchema))
    contentId: string,
  ): Promise<readonly KtoImage[]> {
    return this.tourism.findImages(contentId);
  }
}
