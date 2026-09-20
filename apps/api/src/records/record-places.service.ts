import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  TOTAL_REGIONS,
  type CreateRecordPlaceInput,
  type MapProgressResponse,
  type UpdateRecordPlaceInput,
} from "@tripic/shared";
import {
  RECORD_PLACES,
  type RecordPlacePatch,
  type RecordPlaces,
  type StoredRecordPlace,
} from "@/records/ports/record-places.port";
import { KTO_CLIENT, type KtoClient } from "@/tourism/ports/kto-client.port";

/**
 * 방문 관광지 저장·지도 진행률 유스케이스 (docs/16).
 *
 * 핵심 정책은 둘이다.
 * 1. **지역코드는 클라이언트를 믿지 않는다.** 서버가 KTO 상세에서 뽑아 저장한다 — 임의의 코드를
 *    보내 지도 스탬프를 조작하는 것을 막는다 (§2.1).
 * 2. **KTO 가 실패하면 저장하지 않는다.** 검증되지 않은 값을 대신 넣지 않고 오류를 그대로
 *    전파한다 (§2.3). 503·502·504 매핑은 KTO adapter 가 이미 한다.
 *
 * 소유권은 `RecordsService` 와 같은 규칙이다 — 타인의 자원은 403 이 아니라 404 로 숨긴다.
 */
@Injectable()
export class RecordPlacesService {
  constructor(
    @Inject(RECORD_PLACES) private readonly places: RecordPlaces,
    @Inject(KTO_CLIENT) private readonly kto: KtoClient,
  ) {}

  async add(
    userId: string,
    recordId: string,
    input: CreateRecordPlaceInput,
  ): Promise<StoredRecordPlace> {
    // 소유권을 먼저 본다 — 타인의 기록이면 KTO 쿼터를 쓰지 않는다
    const owned = await this.places.listByRecord(userId, recordId);
    if (!owned) throw this.notFound();

    const verified = await this.verify(input.contentId);
    const saved = await this.places.add(userId, recordId, {
      ktoContentId: input.contentId,
      visitedAt: input.visitedAt,
      ...verified,
    });

    if (saved === null) throw this.notFound();
    if (saved === "DUPLICATE") throw this.duplicate();
    return saved;
  }

  async list(userId: string, recordId: string): Promise<StoredRecordPlace[]> {
    const rows = await this.places.listByRecord(userId, recordId);
    if (!rows) throw this.notFound();
    return rows;
  }

  async update(
    userId: string,
    recordId: string,
    placeId: string,
    input: UpdateRecordPlaceInput,
  ): Promise<StoredRecordPlace> {
    const patch: RecordPlacePatch = {};
    if (input.visitedAt !== undefined) patch.visitedAt = input.visitedAt;
    // contentId 가 바뀔 때만 KTO 를 다시 조회한다 — 방문일만 고치는 요청에 쿼터를 쓰지 않는다
    if (input.contentId !== undefined) {
      patch.ktoContentId = input.contentId;
      Object.assign(patch, await this.verify(input.contentId));
    }

    const updated = await this.places.update(userId, recordId, placeId, patch);
    if (updated === null) throw this.notFound();
    if (updated === "DUPLICATE") throw this.duplicate();
    return updated;
  }

  async remove(
    userId: string,
    recordId: string,
    placeId: string,
  ): Promise<void> {
    const removed = await this.places.remove(userId, recordId, placeId);
    if (!removed) throw this.notFound();
  }

  /**
   * 진행률은 저장하지 않고 조회 시점에 집계한다 — 기록·장소·계정이 지워지면
   * 별도 원복 없이 결과가 즉시 줄어든다 (§2.2).
   */
  async progress(userId: string): Promise<MapProgressResponse> {
    const tallies = await this.places.tallyRegions(userId);

    return {
      visitedAreaCount: tallies.length,
      totalAreaCount: TOTAL_REGIONS,
      recordedPlaceCount: tallies.reduce(
        (total, region) => total + region.visitCount,
        0,
      ),
      regions: tallies.map((region) => ({
        // 진행률 테이블이 없으므로 areaCode 를 안정적인 식별자로 쓴다 (§3.5)
        id: region.areaCode,
        areaCode: region.areaCode,
        visitCount: region.visitCount,
        firstVisitedAt: region.firstVisitedAt,
        lastVisitedAt: region.lastVisitedAt,
      })),
    };
  }

  /** KTO 상세에서 지역·분류 코드를 확인한다. 없는 관광지는 404 */
  private async verify(contentId: string) {
    const detail = await this.kto.findDetail(contentId);
    if (!detail) throw new NotFoundException("tourism place not found");

    return {
      areaCode: detail.areaCode,
      sigunguCode: detail.sigunguCode ?? null,
      categoryCode: detail.categoryCode ?? null,
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException("record place not found");
  }

  private duplicate(): ConflictException {
    return new ConflictException("record place already exists on that date");
  }
}
