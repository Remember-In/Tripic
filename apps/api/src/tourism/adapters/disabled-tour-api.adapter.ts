import { ServiceUnavailableException } from "@nestjs/common";
import type {
  KtoArea,
  KtoImage,
  KtoListItem,
  KtoPlaceDetail,
} from "@tripic/shared";
import type { KtoClient } from "@/tourism/ports/kto-client.port";

const unavailable = () =>
  new ServiceUnavailableException("tourism proxy is not configured");

/**
 * KTO_SERVICE_KEY 를 비운 서버에서 TourAPI 포트 자리에 연결하는 adapter (docs/15 §4).
 * `/tourism` 만 503 이 되고 나머지 API 는 그대로 동작한다.
 * 네이티브 앱은 TourAPI 를 직접 호출하므로 영향받지 않는다.
 */
export class DisabledTourApiAdapter implements KtoClient {
  async searchByKeyword(
    _keyword: string,
    _limit: number,
  ): Promise<readonly KtoListItem[]> {
    throw unavailable();
  }

  async findByArea(
    _filter: { areaCode: string; sigunguCode?: string },
    _limit: number,
  ): Promise<readonly KtoListItem[]> {
    throw unavailable();
  }

  async findDetail(_contentId: string): Promise<KtoPlaceDetail | null> {
    throw unavailable();
  }

  async findImages(_contentId: string): Promise<readonly KtoImage[]> {
    throw unavailable();
  }

  async listAreas(): Promise<readonly KtoArea[]> {
    throw unavailable();
  }
}
