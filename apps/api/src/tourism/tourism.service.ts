import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  KtoArea,
  KtoImage,
  KtoListItem,
  KtoPlaceDetail,
} from "@tripic/shared";
import { KTO_CLIENT, type KtoClient } from "@/tourism/ports/kto-client.port";

interface FindPlacesInput {
  keyword?: string;
  areaCode?: string;
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

  /** keyword 와 areaCode 는 계약에서 배타적으로 검증된다 (tourism.contract.ts) */
  async findPlaces(input: FindPlacesInput): Promise<readonly KtoListItem[]> {
    if (input.keyword) {
      return this.kto.searchByKeyword(input.keyword, input.limit);
    }
    if (input.areaCode) {
      return this.kto.findByArea(
        { areaCode: input.areaCode, sigunguCode: input.sigunguCode },
        input.limit,
      );
    }
    return [];
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
