import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  KtoArea,
  KtoImage,
  KtoListItem,
  KtoPlaceDetail,
} from "@tripic/shared";
import { KTO_CLIENT, type KtoClient } from "@/tourism/ports/kto-client.port";

interface SearchInput {
  keyword: string;
  limit: number;
}

interface FindPlacesInput {
  areaCode: string;
  sigunguCode?: string;
  limit: number;
}

/**
 * TourAPI 조회 유스케이스 (docs/15 §4).
 *
 * 순수 중계다 — 응답을 DB·캐시·로그 어디에도 남기지 않는다.
 * 좌표 기반 주변검색은 제공하지 않는다 (docs/12 §3-②-1).
 */
@Injectable()
export class TourismService {
  constructor(@Inject(KTO_CLIENT) private readonly kto: KtoClient) {}

  /** GET /tourism/search — 사용자가 직접 입력한 키워드로 찾는다 */
  search(input: SearchInput): Promise<readonly KtoListItem[]> {
    return this.kto.searchByKeyword(input.keyword, input.limit);
  }

  /** GET /tourism/places — 시·도(필수)와 시·군·구(선택)로 찾는다 */
  findPlaces(input: FindPlacesInput): Promise<readonly KtoListItem[]> {
    return this.kto.findByArea(
      { areaCode: input.areaCode, sigunguCode: input.sigunguCode },
      input.limit,
    );
  }

  async findDetail(contentId: string): Promise<KtoPlaceDetail> {
    const detail = await this.kto.findDetail(contentId);
    if (!detail) {
      throw new NotFoundException("tourism place not found");
    }
    return detail;
  }

  findImages(contentId: string): Promise<readonly KtoImage[]> {
    return this.kto.findImages(contentId);
  }

  listAreas(): Promise<readonly KtoArea[]> {
    return this.kto.listAreas();
  }
}
