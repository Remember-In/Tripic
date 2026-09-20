import { beforeEach, describe, expect, it } from "vitest";
import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  KtoArea,
  KtoImage,
  KtoListItem,
  KtoPlaceDetail,
} from "@tripic/shared";
import { RecordPlacesService } from "@/records/record-places.service";
import type {
  NewRecordPlace,
  RecordPlacePatch,
  RecordPlaces,
  StoredRecordPlace,
} from "@/records/ports/record-places.port";
import type { KtoAreaFilter, KtoClient } from "@/tourism/ports/kto-client.port";

const OWNER = "user-1";
const RECORD = "rec-1";

const detailOf = (contentId: string): KtoPlaceDetail => ({
  address: "서울 종로구",
  areaCode: "1",
  categoryCode: "A02",
  contentId,
  sigunguCode: "23",
  title: `관광지 ${contentId}`,
});

/** port 계약대로 동작하는 in-memory fake (CLAUDE.md: mock 대신 fake) */
class FakeRecordPlaces implements RecordPlaces {
  rows: StoredRecordPlace[] = [];
  /** 이 사용자만 RECORD 를 소유한다 */
  owner = OWNER;
  private seq = 0;

  private owns(userId: string, recordId: string) {
    return userId === this.owner && recordId === RECORD;
  }

  private duplicate(contentId: string, visitedAt: string, exceptId?: string) {
    return this.rows.some(
      (row) =>
        row.id !== exceptId &&
        row.contentId === contentId &&
        row.visitedAt === visitedAt,
    );
  }

  async add(userId: string, recordId: string, place: NewRecordPlace) {
    if (!this.owns(userId, recordId)) return null;
    if (this.duplicate(place.ktoContentId, place.visitedAt)) return "DUPLICATE";

    const row: StoredRecordPlace = {
      id: `place-${++this.seq}`,
      recordId,
      contentId: place.ktoContentId,
      areaCode: place.areaCode,
      sigunguCode: place.sigunguCode,
      categoryCode: place.categoryCode,
      visitedAt: place.visitedAt,
      createdAt: new Date().toISOString(),
    };
    this.rows.push(row);
    return row;
  }

  async listByRecord(userId: string, recordId: string) {
    return this.owns(userId, recordId) ? [...this.rows] : null;
  }

  async update(
    userId: string,
    recordId: string,
    placeId: string,
    patch: RecordPlacePatch,
  ) {
    if (!this.owns(userId, recordId)) return null;
    const row = this.rows.find((candidate) => candidate.id === placeId);
    if (!row) return null;

    const contentId = patch.ktoContentId ?? row.contentId;
    const visitedAt = patch.visitedAt ?? row.visitedAt;
    if (this.duplicate(contentId, visitedAt, placeId)) return "DUPLICATE";

    row.contentId = contentId;
    row.visitedAt = visitedAt;
    if (patch.areaCode !== undefined) row.areaCode = patch.areaCode;
    if (patch.sigunguCode !== undefined) row.sigunguCode = patch.sigunguCode;
    if (patch.categoryCode !== undefined) row.categoryCode = patch.categoryCode;
    return row;
  }

  async remove(userId: string, recordId: string, placeId: string) {
    if (!this.owns(userId, recordId)) return false;
    const before = this.rows.length;
    this.rows = this.rows.filter((row) => row.id !== placeId);
    return this.rows.length < before;
  }

  async tallyRegions(userId: string) {
    if (userId !== this.owner) return [];
    const byArea = new Map<string, string[]>();
    for (const row of this.rows) {
      byArea.set(row.areaCode, [
        ...(byArea.get(row.areaCode) ?? []),
        row.visitedAt,
      ]);
    }
    return [...byArea.entries()]
      .map(([areaCode, dates]) => {
        const sorted = [...dates].sort();
        return {
          areaCode,
          visitCount: dates.length,
          firstVisitedAt: sorted[0] ?? "",
          lastVisitedAt: sorted[sorted.length - 1] ?? "",
        };
      })
      .sort((left, right) => left.areaCode.localeCompare(right.areaCode));
  }
}

class FakeKtoClient implements KtoClient {
  detailCalls: string[] = [];
  known = new Set(["126508", "126509"]);
  failure: Error | null = null;

  async searchByKeyword(): Promise<readonly KtoListItem[]> {
    return [];
  }
  async findByArea(_filter: KtoAreaFilter): Promise<readonly KtoListItem[]> {
    return [];
  }
  async findDetail(contentId: string) {
    this.detailCalls.push(contentId);
    if (this.failure) throw this.failure;
    return this.known.has(contentId) ? detailOf(contentId) : null;
  }
  async findImages(): Promise<readonly KtoImage[]> {
    return [];
  }
  async listAreas(): Promise<readonly KtoArea[]> {
    return [];
  }
}

describe("RecordPlacesService (docs/16)", () => {
  let places: FakeRecordPlaces;
  let kto: FakeKtoClient;
  let service: RecordPlacesService;

  beforeEach(() => {
    places = new FakeRecordPlaces();
    kto = new FakeKtoClient();
    service = new RecordPlacesService(places, kto);
  });

  const add = (contentId = "126508", visitedAt = "2026-09-20") =>
    service.add(OWNER, RECORD, { contentId, visitedAt });

  describe("add", () => {
    it("KTO 가 확인한 지역코드만 저장한다 — 클라이언트는 지역을 보내지 않는다", async () => {
      const created = await add();

      expect(kto.detailCalls).toEqual(["126508"]);
      expect(created).toMatchObject({
        contentId: "126508",
        areaCode: "1",
        sigunguCode: "23",
        categoryCode: "A02",
        visitedAt: "2026-09-20",
      });
    });

    it("KTO 에 없는 contentId 는 404 이고 저장하지 않는다", async () => {
      await expect(add("999999")).rejects.toBeInstanceOf(NotFoundException);
      expect(places.rows).toHaveLength(0);
    });

    it("타인의 기록이면 404 이고 KTO 를 호출하지 않는다", async () => {
      await expect(
        service.add("stranger", RECORD, {
          contentId: "126508",
          visitedAt: "2026-09-20",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(kto.detailCalls).toEqual([]);
    });

    it("같은 관광지·같은 날 중복은 409", async () => {
      await add();

      await expect(add()).rejects.toBeInstanceOf(ConflictException);
      expect(places.rows).toHaveLength(1);
    });

    it("같은 관광지라도 날짜가 다르면 저장된다", async () => {
      await add("126508", "2026-09-20");
      await add("126508", "2026-09-21");

      expect(places.rows).toHaveLength(2);
    });

    /** KTO 가 실패하면 검증되지 않은 값을 대신 저장하지 않는다 (docs/16 §2.3) */
    it("KTO 장애는 그대로 전파하고 저장하지 않는다", async () => {
      kto.failure = new ServiceUnavailableException("tourism proxy off");

      await expect(add()).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(places.rows).toHaveLength(0);
    });
  });

  describe("list", () => {
    it("소유한 기록의 장소를 돌려준다", async () => {
      await add();

      await expect(service.list(OWNER, RECORD)).resolves.toHaveLength(1);
    });

    it("타인의 기록은 404 — 빈 배열과 구분한다", async () => {
      await expect(service.list("stranger", RECORD)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("contentId 가 바뀌면 KTO 를 다시 조회해 지역코드를 교체한다", async () => {
      const created = await add();
      kto.detailCalls = [];

      await service.update(OWNER, RECORD, created.id, {
        contentId: "126509",
      });

      expect(kto.detailCalls).toEqual(["126509"]);
      expect(places.rows[0]?.contentId).toBe("126509");
    });

    it("방문일만 바뀌면 KTO 를 호출하지 않는다", async () => {
      const created = await add();
      kto.detailCalls = [];

      await service.update(OWNER, RECORD, created.id, {
        visitedAt: "2026-09-22",
      });

      expect(kto.detailCalls).toEqual([]);
      expect(places.rows[0]?.visitedAt).toBe("2026-09-22");
    });

    it("없는 장소는 404", async () => {
      await expect(
        service.update(OWNER, RECORD, "missing", { visitedAt: "2026-09-22" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("수정 결과가 기존 행과 겹치면 409", async () => {
      await add("126508", "2026-09-20");
      const second = await add("126508", "2026-09-21");

      await expect(
        service.update(OWNER, RECORD, second.id, { visitedAt: "2026-09-20" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("remove", () => {
    it("지우면 목록에서 사라진다", async () => {
      const created = await add();

      await service.remove(OWNER, RECORD, created.id);

      expect(places.rows).toHaveLength(0);
    });

    it("없는 장소는 404", async () => {
      await expect(
        service.remove(OWNER, RECORD, "missing"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("progress", () => {
    it("지역별로 집계하고 방문한 지역만 담는다", async () => {
      await add("126508", "2026-09-20");
      await add("126509", "2026-08-12");

      const progress = await service.progress(OWNER);

      expect(progress.totalAreaCount).toBe(17);
      expect(progress.recordedPlaceCount).toBe(2);
      expect(progress.visitedAreaCount).toBe(1);
      expect(progress.regions).toEqual([
        {
          id: "1",
          areaCode: "1",
          visitCount: 2,
          firstVisitedAt: "2026-08-12",
          lastVisitedAt: "2026-09-20",
        },
      ]);
    });

    it("방문이 없으면 빈 지역 목록", async () => {
      const progress = await service.progress(OWNER);

      expect(progress.visitedAreaCount).toBe(0);
      expect(progress.regions).toEqual([]);
    });

    it("사용자별로 격리된다", async () => {
      await add();

      await expect(service.progress("stranger")).resolves.toMatchObject({
        recordedPlaceCount: 0,
      });
    });
  });
});
