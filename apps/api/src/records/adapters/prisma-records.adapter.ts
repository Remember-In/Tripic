import { Injectable } from "@nestjs/common";
import type { RecordDay, RecordDetail, RecordSummary } from "@tripic/shared";
import { PrismaService } from "@/prisma/prisma.service";
import type {
  NewEntry,
  NewPhoto,
  NewRecord,
  PhotoUsage,
  RecordPatch,
  RecordsRepository,
  StoredEntry,
  StoredPhoto,
} from "@/records/ports/records-repository.port";
import type { Prisma, Record as RecordRow } from "@/generated/prisma/client";

/** `YYYY-MM-DD` ↔ Postgres date(UTC 자정) 변환 */
const toDate = (day: string): Date => new Date(`${day}T00:00:00.000Z`);
const toDay = (date: Date): string => date.toISOString().slice(0, 10);

interface DayRow {
  date: Date;
}

/** 대표 사진 선정에 필요한 만큼만 — 바이트(bytea)가 섞이면 타입에서 걸린다 */
interface PhotoRow {
  id: string;
  date: Date;
}

/** 사진 바이너리 서빙 경로 — 상세와 요약이 같은 규칙을 쓰도록 한 곳에 둔다 */
const photoUrl = (recordId: string, day: string, photoId: string) =>
  `/records/${recordId}/days/${day}/photos/${photoId}`;

/**
 * 요약 계산에 필요한 날짜와 대표 사진 id 만 읽는다 — 사진 바이트(bytea)는 절대 싣지 않는다.
 * 사진 id 는 uuid(7) 이라 시간 순이므로, (date, id) 오름차순의 첫 행이 곧
 * "가장 이른 일차의 가장 먼저 올린 사진" 이다.
 */
const dayColumns = {
  entries: { select: { date: true } },
  photos: {
    select: { id: true, date: true },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  },
  // satisfies 는 단언이 아니라 검사다 — include 계약 위반을 잡으면서
  // "asc" 같은 리터럴 타입을 남겨 row.entries/row.photos 추론을 유지한다.
} satisfies Prisma.RecordInclude;

@Injectable()
export class PrismaRecordsAdapter implements RecordsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(record: NewRecord): Promise<RecordSummary> {
    const created = await this.prisma.record.create({
      data: {
        userId: record.userId,
        title: record.title,
        theme: record.theme,
        style: record.style,
        hashtags: record.hashtags,
      },
    });
    return this.toSummary(created, [], []);
  }

  async listByUser(userId: string): Promise<RecordSummary[]> {
    const rows = await this.prisma.record.findMany({
      where: { userId },
      include: dayColumns,
    });

    // 여행일 기준 최근순 — endDate 내림차순, 없으면 createdAt 으로 대체 (docs/11 §3).
    // 정렬 키가 행마다 달라 SQL ORDER BY 로 표현하기 어려우므로 여기서 정렬한다
    // (기록 수가 문제되면 endDate 를 컬럼으로 승격하고 페이지네이션을 도입한다).
    return rows
      .map((row) => this.toSummary(row, row.entries, row.photos))
      .sort((left, right) =>
        (right.endDate ?? right.createdAt).localeCompare(
          left.endDate ?? left.createdAt,
        ),
      );
  }

  async findDetail(
    userId: string,
    recordId: string,
  ): Promise<RecordDetail | null> {
    const row = await this.prisma.record.findFirst({
      where: { id: recordId, userId },
      include: {
        entries: { orderBy: { date: "asc" } },
        // 목록 응답에 바이트는 필요 없다 — id 와 날짜만 읽는다
        photos: { select: { id: true, date: true }, orderBy: { id: "asc" } },
      },
    });
    if (!row) return null;

    // 일기와 사진은 날짜를 공유하는 형제 관계 — 한쪽만 있는 일차도 존재한다
    const days = new Map<string, RecordDay>();
    const dayOf = (date: Date): RecordDay => {
      const key = toDay(date);
      const existing = days.get(key);
      if (existing) return existing;
      const created: RecordDay = { date: key, entry: null, photos: [] };
      days.set(key, created);
      return created;
    };

    for (const entry of row.entries) {
      dayOf(entry.date).entry = {
        content: entry.content,
        source: entry.source,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      };
    }
    for (const photo of row.photos) {
      const day = dayOf(photo.date);
      day.photos.push({
        id: photo.id,
        url: photoUrl(row.id, day.date, photo.id),
      });
    }

    return {
      id: row.id,
      title: row.title,
      theme: row.theme,
      style: row.style,
      hashtags: row.hashtags,
      days: [...days.values()].sort((left, right) =>
        left.date.localeCompare(right.date),
      ),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async update(
    userId: string,
    recordId: string,
    patch: RecordPatch,
  ): Promise<RecordSummary | null> {
    // 소유권을 where 에 포함해 타인의 기록은 0건으로 끝난다
    const { count } = await this.prisma.record.updateMany({
      where: { id: recordId, userId },
      data: patch,
    });
    if (count === 0) return null;

    const row = await this.prisma.record.findFirstOrThrow({
      where: { id: recordId, userId },
      include: dayColumns,
    });
    return this.toSummary(row, row.entries, row.photos);
  }

  async delete(userId: string, recordId: string): Promise<boolean> {
    const { count } = await this.prisma.record.deleteMany({
      where: { id: recordId, userId },
    });
    return count > 0;
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.prisma.record.deleteMany({ where: { userId } });
  }

  async upsertEntry(
    userId: string,
    recordId: string,
    date: string,
    entry: NewEntry,
  ): Promise<StoredEntry | null> {
    return this.prisma.$transaction(async (tx) => {
      const owned = await tx.record.findFirst({
        where: { id: recordId, userId },
        select: { id: true },
      });
      if (!owned) return null;

      const saved = await tx.recordEntry.upsert({
        where: { recordId_date: { recordId, date: toDate(date) } },
        create: { recordId, date: toDate(date), ...entry },
        update: entry,
      });
      // 일기가 바뀌면 기록도 갱신된 것으로 본다 (상세 응답의 updatedAt)
      await tx.record.update({
        where: { id: recordId },
        data: { updatedAt: new Date() },
      });

      return {
        content: saved.content,
        source: saved.source,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      };
    });
  }

  async deleteEntry(
    userId: string,
    recordId: string,
    date: string,
  ): Promise<boolean> {
    const { count } = await this.prisma.recordEntry.deleteMany({
      where: { recordId, date: toDate(date), record: { userId } },
    });
    return count > 0;
  }

  async photoUsage(
    userId: string,
    recordId: string,
  ): Promise<PhotoUsage | null> {
    const owned = await this.prisma.record.findFirst({
      where: { id: recordId, userId },
      select: { id: true },
    });
    if (!owned) return null;

    const [recordPhotoCount, userTotal] = await Promise.all([
      this.prisma.recordPhoto.count({ where: { recordId } }),
      // data 를 읽지 않고 size 컬럼만 합산한다
      this.prisma.recordPhoto.aggregate({
        where: { record: { userId } },
        _sum: { size: true },
      }),
    ]);

    return {
      recordPhotoCount,
      userTotalBytes: userTotal._sum.size ?? 0,
    };
  }

  async addPhoto(
    userId: string,
    recordId: string,
    date: string,
    photo: NewPhoto,
  ): Promise<string | null> {
    const owned = await this.prisma.record.findFirst({
      where: { id: recordId, userId },
      select: { id: true },
    });
    if (!owned) return null;

    const created = await this.prisma.recordPhoto.create({
      data: {
        recordId,
        date: toDate(date),
        // Prisma 의 Bytes 는 Uint8Array 를 받는다 — 복사 없이 같은 메모리를 가리키게 감싼다
        data: new Uint8Array(
          photo.data.buffer,
          photo.data.byteOffset,
          photo.data.byteLength,
        ),
        mimeType: photo.mimeType,
        size: photo.size,
      },
      select: { id: true },
    });
    return created.id;
  }

  async findPhoto(
    userId: string,
    recordId: string,
    date: string,
    photoId: string,
  ): Promise<StoredPhoto | null> {
    const row = await this.prisma.recordPhoto.findFirst({
      where: {
        id: photoId,
        recordId,
        date: toDate(date),
        record: { userId },
      },
    });
    if (!row) return null;
    return {
      // copyBytesFrom 은 ArrayBuffer 백업 Buffer 를 보장한다 (StreamableFile 타입 요구)
      id: row.id,
      data: Buffer.copyBytesFrom(row.data),
      mimeType: row.mimeType,
    };
  }

  async deletePhoto(
    userId: string,
    recordId: string,
    date: string,
    photoId: string,
  ): Promise<boolean> {
    const { count } = await this.prisma.recordPhoto.deleteMany({
      where: {
        id: photoId,
        recordId,
        date: toDate(date),
        record: { userId },
      },
    });
    return count > 0;
  }

  /** 날짜 범위는 일기와 사진을 합쳐서 잡고, entryCount 는 일기 수만 센다 (docs/11 §3) */
  private toSummary(
    row: RecordRow,
    entries: DayRow[],
    photos: PhotoRow[],
  ): RecordSummary {
    const days = [...entries, ...photos].map((row) => toDay(row.date)).sort();
    // dayColumns 가 (date, id) 오름차순으로 읽으므로 첫 행이 곧 대표 사진이다
    const cover = photos.at(0);
    return {
      id: row.id,
      title: row.title,
      theme: row.theme,
      style: row.style,
      hashtags: row.hashtags,
      entryCount: entries.length,
      startDate: days.at(0) ?? null,
      endDate: days.at(-1) ?? null,
      coverPhoto: cover
        ? { id: cover.id, url: photoUrl(row.id, toDay(cover.date), cover.id) }
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
