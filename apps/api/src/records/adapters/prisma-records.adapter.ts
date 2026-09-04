import { Injectable } from "@nestjs/common";
import type { RecordDetail, RecordSummary } from "@tripic/shared";
import { PrismaService } from "@/prisma/prisma.service";
import type {
  NewEntry,
  NewRecord,
  RecordPatch,
  RecordsRepository,
  StoredEntry,
} from "@/records/ports/records-repository.port";
import type { Record as RecordRow } from "@/generated/prisma/client";

/** `YYYY-MM-DD` ↔ Postgres date(UTC 자정) 변환 */
const toDate = (day: string): Date => new Date(`${day}T00:00:00.000Z`);
const toDay = (date: Date): string => date.toISOString().slice(0, 10);

interface EntryDate {
  date: Date;
}

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
    return this.toSummary(created, []);
  }

  async listByUser(userId: string): Promise<RecordSummary[]> {
    const rows = await this.prisma.record.findMany({
      where: { userId },
      include: { entries: { select: { date: true } } },
    });

    // 여행일 기준 최근순 — endDate 내림차순, 없으면 createdAt 으로 대체 (docs/11 §3).
    // 정렬 키가 행마다 달라 SQL ORDER BY 로 표현하기 어려우므로 여기서 정렬한다
    // (기록 수가 문제되면 endDate 를 컬럼으로 승격하고 페이지네이션을 도입한다).
    return rows
      .map((row) => this.toSummary(row, row.entries))
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
      include: { entries: { orderBy: { date: "asc" } } },
    });
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      theme: row.theme,
      style: row.style,
      hashtags: row.hashtags,
      days: row.entries.map((entry) => ({
        date: toDay(entry.date),
        entry: {
          content: entry.content,
          source: entry.source,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
        },
        // 사진 업로드(docs/11 §3.1) 구현 전까지는 항상 비어 있다
        photos: [],
      })),
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
      include: { entries: { select: { date: true } } },
    });
    return this.toSummary(row, row.entries);
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

  private toSummary(row: RecordRow, entries: EntryDate[]): RecordSummary {
    const days = entries.map((entry) => toDay(entry.date)).sort();
    return {
      id: row.id,
      title: row.title,
      theme: row.theme,
      style: row.style,
      hashtags: row.hashtags,
      entryCount: days.length,
      startDate: days.at(0) ?? null,
      endDate: days.at(-1) ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
