import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type {
  NewRecordPlace,
  RecordPlacePatch,
  RecordPlaces,
  RegionVisitTally,
  StoredRecordPlace,
} from "@/records/ports/record-places.port";
import type { RecordPlace as RecordPlaceRow } from "@/generated/prisma/client";

/** `YYYY-MM-DD` ↔ Postgres date(UTC 자정) 변환 — RecordPhoto 와 같은 규칙 */
const toDate = (day: string): Date => new Date(`${day}T00:00:00.000Z`);
const toDay = (date: Date): string => date.toISOString().slice(0, 10);

/** Prisma 가 unique 위반에 쓰는 코드 */
const UNIQUE_VIOLATION = "P2002";

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === UNIQUE_VIOLATION;

const toStored = (row: RecordPlaceRow): StoredRecordPlace => ({
  id: row.id,
  recordId: row.recordId,
  contentId: row.ktoContentId,
  areaCode: row.areaCode,
  sigunguCode: row.sigunguCode,
  categoryCode: row.categoryCode,
  visitedAt: toDay(row.visitedAt),
  createdAt: row.createdAt.toISOString(),
});

/**
 * 방문 관광지 영속성 adapter (docs/16).
 *
 * 소유권은 전부 `record: { userId }` 조건으로 SQL 안에서 거른다 — 타인의 자원은 0건이 되어
 * 서비스가 404 로 번역한다.
 * 중복은 `@@unique([recordId, ktoContentId, visitedAt])` 가 최종적으로 막고, 동시 요청 경합에서
 * 터지는 P2002 를 여기서 `"DUPLICATE"` 로 흡수한다.
 */
@Injectable()
export class PrismaRecordPlacesAdapter implements RecordPlaces {
  constructor(private readonly prisma: PrismaService) {}

  async add(
    userId: string,
    recordId: string,
    place: NewRecordPlace,
  ): Promise<StoredRecordPlace | "DUPLICATE" | null> {
    const owned = await this.prisma.record.findFirst({
      where: { id: recordId, userId },
      select: { id: true },
    });
    if (!owned) return null;

    try {
      const created = await this.prisma.recordPlace.create({
        data: {
          recordId,
          ktoContentId: place.ktoContentId,
          visitedAt: toDate(place.visitedAt),
          areaCode: place.areaCode,
          sigunguCode: place.sigunguCode,
          categoryCode: place.categoryCode,
        },
      });
      return toStored(created);
    } catch (error) {
      if (isUniqueViolation(error)) return "DUPLICATE";
      throw error;
    }
  }

  async listByRecord(
    userId: string,
    recordId: string,
  ): Promise<StoredRecordPlace[] | null> {
    const owned = await this.prisma.record.findFirst({
      where: { id: recordId, userId },
      select: { id: true },
    });
    if (!owned) return null;

    const rows = await this.prisma.recordPlace.findMany({
      where: { recordId },
      orderBy: [{ visitedAt: "asc" }, { id: "asc" }],
    });
    return rows.map(toStored);
  }

  async update(
    userId: string,
    recordId: string,
    placeId: string,
    patch: RecordPlacePatch,
  ): Promise<StoredRecordPlace | "DUPLICATE" | null> {
    // 소유권을 where 에 포함해 타인의 기록은 0건으로 끝난다
    const { count } = await this.prisma.recordPlace
      .updateMany({
        where: { id: placeId, recordId, record: { userId } },
        data: {
          ...(patch.ktoContentId !== undefined && {
            ktoContentId: patch.ktoContentId,
          }),
          ...(patch.visitedAt !== undefined && {
            visitedAt: toDate(patch.visitedAt),
          }),
          ...(patch.areaCode !== undefined && { areaCode: patch.areaCode }),
          ...(patch.sigunguCode !== undefined && {
            sigunguCode: patch.sigunguCode,
          }),
          ...(patch.categoryCode !== undefined && {
            categoryCode: patch.categoryCode,
          }),
        },
      })
      .catch((error: unknown) => {
        if (isUniqueViolation(error)) return { count: -1 };
        throw error;
      });

    if (count === -1) return "DUPLICATE";
    if (count === 0) return null;

    const updated = await this.prisma.recordPlace.findFirst({
      where: { id: placeId, recordId, record: { userId } },
    });
    return updated ? toStored(updated) : null;
  }

  async remove(
    userId: string,
    recordId: string,
    placeId: string,
  ): Promise<boolean> {
    const { count } = await this.prisma.recordPlace.deleteMany({
      where: { id: placeId, recordId, record: { userId } },
    });
    return count > 0;
  }

  async tallyRegions(userId: string): Promise<RegionVisitTally[]> {
    const grouped = await this.prisma.recordPlace.groupBy({
      by: ["areaCode"],
      where: { record: { userId } },
      _count: { _all: true },
      _min: { visitedAt: true },
      _max: { visitedAt: true },
      orderBy: { areaCode: "asc" },
    });

    return grouped.flatMap<RegionVisitTally>((region) => {
      const first = region._min.visitedAt;
      const last = region._max.visitedAt;
      if (!first || !last) return [];
      return [
        {
          areaCode: region.areaCode,
          visitCount: region._count._all,
          firstVisitedAt: toDay(first),
          lastVisitedAt: toDay(last),
        },
      ];
    });
  }
}
