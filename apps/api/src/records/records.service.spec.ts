import { beforeEach, describe, expect, it } from "vitest";
import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import type { RecordDetail, RecordSummary } from "@tripic/shared";
import {
  MAX_PHOTOS_PER_RECORD,
  MAX_PHOTO_BYTES,
  RecordsService,
} from "@/records/records.service";
import {
  ImageRejected,
  type ImageInspector,
  type ImageRejection,
  type InspectedImage,
} from "@/records/ports/image-inspector.port";
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

interface StoredPhotoRow {
  id: string;
  date: string;
  data: Buffer<ArrayBuffer>;
  mimeType: string;
  size: number;
}

interface StoredRecord {
  summary: RecordSummary;
  userId: string;
  entries: Map<string, StoredEntry>;
  photos: StoredPhotoRow[];
}

/** port 계약대로 동작하는 in-memory fake (CLAUDE.md: mock 대신 fake) */
class FakeRecords implements RecordsRepository {
  rows = new Map<string, StoredRecord>();
  private seq = 0;

  private summaryOf(row: StoredRecord): RecordSummary {
    const dates = [...row.entries.keys()].sort();
    return {
      ...row.summary,
      entryCount: dates.length,
      startDate: dates.at(0) ?? null,
      endDate: dates.at(-1) ?? null,
    };
  }

  /** 소유권 필터 — 타인의 기록은 없는 것으로 취급한다 */
  private own(userId: string, recordId: string): StoredRecord | null {
    const row = this.rows.get(recordId);
    return row && row.userId === userId ? row : null;
  }

  async create(record: NewRecord): Promise<RecordSummary> {
    const id = `rec-${++this.seq}`;
    const now = new Date().toISOString();
    const summary: RecordSummary = {
      id,
      title: record.title,
      theme: record.theme,
      style: record.style,
      hashtags: record.hashtags,
      entryCount: 0,
      startDate: null,
      endDate: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(id, {
      summary,
      userId: record.userId,
      entries: new Map(),
      photos: [],
    });
    return summary;
  }

  async listByUser(userId: string): Promise<RecordSummary[]> {
    return [...this.rows.values()]
      .filter((row) => row.userId === userId)
      .map((row) => this.summaryOf(row))
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
    const row = this.own(userId, recordId);
    if (!row) return null;
    const {
      entryCount: _count,
      startDate: _start,
      endDate: _end,
      ...rest
    } = row.summary;
    return {
      ...rest,
      days: [...row.entries.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, entry]) => ({ date, entry, photos: [] })),
    };
  }

  async update(
    userId: string,
    recordId: string,
    patch: RecordPatch,
  ): Promise<RecordSummary | null> {
    const row = this.own(userId, recordId);
    if (!row) return null;
    if (patch.title !== undefined) row.summary.title = patch.title;
    if (patch.theme !== undefined) row.summary.theme = patch.theme;
    if (patch.style !== undefined) row.summary.style = patch.style;
    if (patch.hashtags !== undefined) row.summary.hashtags = patch.hashtags;
    return this.summaryOf(row);
  }

  async delete(userId: string, recordId: string): Promise<boolean> {
    if (!this.own(userId, recordId)) return false;
    this.rows.delete(recordId);
    return true;
  }

  async deleteAllByUser(userId: string): Promise<void> {
    for (const [id, row] of this.rows) {
      if (row.userId === userId) this.rows.delete(id);
    }
  }

  async upsertEntry(
    userId: string,
    recordId: string,
    date: string,
    entry: NewEntry,
  ): Promise<StoredEntry | null> {
    const row = this.own(userId, recordId);
    if (!row) return null;
    const now = new Date().toISOString();
    const stored: StoredEntry = {
      ...entry,
      createdAt: row.entries.get(date)?.createdAt ?? now,
      updatedAt: now,
    };
    row.entries.set(date, stored);
    return stored;
  }

  async deleteEntry(
    userId: string,
    recordId: string,
    date: string,
  ): Promise<boolean> {
    const row = this.own(userId, recordId);
    return row ? row.entries.delete(date) : false;
  }

  async photoUsage(
    userId: string,
    recordId: string,
  ): Promise<PhotoUsage | null> {
    const row = this.own(userId, recordId);
    if (!row) return null;
    const userTotalBytes = [...this.rows.values()]
      .filter((candidate) => candidate.userId === userId)
      .flatMap((candidate) => candidate.photos)
      .reduce((total, photo) => total + photo.size, 0);
    return { recordPhotoCount: row.photos.length, userTotalBytes };
  }

  async addPhoto(
    userId: string,
    recordId: string,
    date: string,
    photo: NewPhoto,
  ): Promise<string | null> {
    const row = this.own(userId, recordId);
    if (!row) return null;
    const id = `photo-${++this.seq}`;
    row.photos.push({ id, date, ...photo });
    return id;
  }

  async findPhoto(
    userId: string,
    recordId: string,
    date: string,
    photoId: string,
  ): Promise<StoredPhoto | null> {
    const row = this.own(userId, recordId);
    const photo = row?.photos.find(
      (candidate) => candidate.id === photoId && candidate.date === date,
    );
    return photo
      ? { id: photo.id, data: photo.data, mimeType: photo.mimeType }
      : null;
  }

  async deletePhoto(
    userId: string,
    recordId: string,
    date: string,
    photoId: string,
  ): Promise<boolean> {
    const row = this.own(userId, recordId);
    if (!row) return false;
    const index = row.photos.findIndex(
      (candidate) => candidate.id === photoId && candidate.date === date,
    );
    if (index < 0) return false;
    row.photos.splice(index, 1);
    return true;
  }
}

/** 통과/거부를 테스트가 정하는 검증기 fake — sharp 없이 서비스 정책만 검증한다 */
class FakeImageInspector implements ImageInspector {
  rejection: ImageRejection | null = null;

  async inspect(): Promise<InspectedImage> {
    if (this.rejection) throw new ImageRejected(this.rejection);
    return { mimeType: "image/jpeg", width: 100, height: 100 };
  }
}

const OWNER = "user-1";
const STRANGER = "user-2";

describe("RecordsService", () => {
  let records: FakeRecords;
  let images: FakeImageInspector;
  let service: RecordsService;

  beforeEach(() => {
    records = new FakeRecords();
    images = new FakeImageInspector();
    service = new RecordsService(records, images);
  });

  const createRecord = () =>
    service.create(OWNER, {
      title: "경주 여행",
      theme: "NATURE_SCENERY",
      hashtags: ["#경주"],
    });

  describe("create", () => {
    it("생성 직후에는 일기가 없어 날짜 범위가 비어 있다", async () => {
      const created = await createRecord();

      expect(created.title).toBe("경주 여행");
      expect(created.theme).toBe("NATURE_SCENERY");
      expect(created.entryCount).toBe(0);
      expect(created.startDate).toBeNull();
      expect(created.endDate).toBeNull();
    });

    it("선택 필드를 생략하면 테마·문체는 null, 해시태그는 빈 배열", async () => {
      const created = await service.create(OWNER, {
        title: "제주",
        hashtags: [],
      });

      expect(created.theme).toBeNull();
      expect(created.style).toBeNull();
      expect(created.hashtags).toEqual([]);
    });
  });

  describe("list", () => {
    it("내 기록만 돌려준다", async () => {
      await createRecord();
      await service.create(STRANGER, { title: "남의 기록", hashtags: [] });

      const mine = await service.list(OWNER);

      expect(mine).toHaveLength(1);
      expect(mine[0].title).toBe("경주 여행");
    });
  });

  describe("findOne", () => {
    it("일기를 쓴 날짜가 days 에 오름차순으로 담긴다", async () => {
      const created = await createRecord();
      await service.upsertEntry(OWNER, created.id, "2026-08-16", {
        content: "둘째 날",
        source: "USER",
      });
      await service.upsertEntry(OWNER, created.id, "2026-08-15", {
        content: "첫째 날",
        source: "AI",
      });

      const detail = await service.findOne(OWNER, created.id);

      expect(detail.days.map((day) => day.date)).toEqual([
        "2026-08-15",
        "2026-08-16",
      ]);
      expect(detail.days[0].entry?.source).toBe("AI");
      expect(detail.days[0].photos).toEqual([]);
    });

    it("타인의 기록은 404 로 존재를 숨긴다", async () => {
      const created = await createRecord();

      await expect(
        service.findOne(STRANGER, created.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("없는 기록도 404", async () => {
      await expect(service.findOne(OWNER, "rec-없음")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("보낸 필드만 바꾸고 나머지는 유지한다", async () => {
      const created = await createRecord();

      const updated = await service.update(OWNER, created.id, {
        title: "경주 2박3일",
      });

      expect(updated.title).toBe("경주 2박3일");
      expect(updated.theme).toBe("NATURE_SCENERY");
    });

    it("theme 에 null 을 보내면 해제한다", async () => {
      const created = await createRecord();

      const updated = await service.update(OWNER, created.id, { theme: null });

      expect(updated.theme).toBeNull();
    });

    it("타인의 기록은 404", async () => {
      const created = await createRecord();

      await expect(
        service.update(STRANGER, created.id, { title: "가로채기" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("remove", () => {
    it("내 기록이면 지운다", async () => {
      const created = await createRecord();

      await service.remove(OWNER, created.id);

      await expect(service.findOne(OWNER, created.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("타인의 기록은 404 이고 실제로 지워지지 않는다", async () => {
      const created = await createRecord();

      await expect(service.remove(STRANGER, created.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.findOne(OWNER, created.id)).resolves.toBeTruthy();
    });
  });

  describe("removeAll", () => {
    it("내 기록만 전부 지운다", async () => {
      await createRecord();
      await createRecord();
      await service.create(STRANGER, { title: "남의 기록", hashtags: [] });

      await service.removeAll(OWNER);

      expect(await service.list(OWNER)).toEqual([]);
      expect(await service.list(STRANGER)).toHaveLength(1);
    });
  });

  describe("upsertEntry", () => {
    it("같은 날짜에 다시 쓰면 교체하고 작성 시각은 유지한다", async () => {
      const created = await createRecord();
      const first = await service.upsertEntry(OWNER, created.id, "2026-08-15", {
        content: "처음",
        source: "AI",
      });

      const second = await service.upsertEntry(
        OWNER,
        created.id,
        "2026-08-15",
        {
          content: "고쳐 씀",
          source: "USER",
        },
      );

      expect(second.content).toBe("고쳐 씀");
      expect(second.source).toBe("USER");
      expect(second.createdAt).toBe(first.createdAt);

      const detail = await service.findOne(OWNER, created.id);
      expect(detail.days).toHaveLength(1);
    });

    it("일기를 쓰면 요약의 날짜 범위와 개수가 갱신된다", async () => {
      const created = await createRecord();
      await service.upsertEntry(OWNER, created.id, "2026-08-15", {
        content: "첫째 날",
        source: "USER",
      });
      await service.upsertEntry(OWNER, created.id, "2026-08-17", {
        content: "셋째 날",
        source: "USER",
      });

      const [summary] = await service.list(OWNER);

      expect(summary.entryCount).toBe(2);
      expect(summary.startDate).toBe("2026-08-15");
      expect(summary.endDate).toBe("2026-08-17");
    });

    it("타인의 기록에는 쓸 수 없다 (404)", async () => {
      const created = await createRecord();

      await expect(
        service.upsertEntry(STRANGER, created.id, "2026-08-15", {
          content: "가로채기",
          source: "USER",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("addPhoto", () => {
    const photo = Buffer.from("이미지 바이트");

    it("검증을 통과하면 저장하고 서빙 경로를 돌려준다", async () => {
      const created = await createRecord();

      const saved = await service.addPhoto(
        OWNER,
        created.id,
        "2026-08-15",
        photo,
      );

      expect(saved.id).toBeTruthy();
      expect(saved.url).toBe(
        `/records/${created.id}/days/2026-08-15/photos/${saved.id}`,
      );
    });

    it("메타데이터가 남아 있으면 400 으로 거부한다", async () => {
      const created = await createRecord();
      images.rejection = "HAS_METADATA";

      await expect(
        service.addPhoto(OWNER, created.id, "2026-08-15", photo),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("이미지가 아니면 400", async () => {
      const created = await createRecord();
      images.rejection = "NOT_AN_IMAGE";

      await expect(
        service.addPhoto(OWNER, created.id, "2026-08-15", photo),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("파일당 한도를 넘으면 413 이고 디코딩까지 가지 않는다", async () => {
      const created = await createRecord();
      images.rejection = "NOT_AN_IMAGE"; // 여기까지 왔다면 400 이 났을 것

      await expect(
        service.addPhoto(
          OWNER,
          created.id,
          "2026-08-15",
          Buffer.alloc(MAX_PHOTO_BYTES + 1),
        ),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);
    });

    it("기록당 장수를 넘으면 413", async () => {
      const created = await createRecord();
      for (let index = 0; index < MAX_PHOTOS_PER_RECORD; index += 1) {
        await service.addPhoto(OWNER, created.id, "2026-08-15", photo);
      }

      await expect(
        service.addPhoto(OWNER, created.id, "2026-08-15", photo),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);
    });

    it("타인의 기록에는 올릴 수 없다 (404)", async () => {
      const created = await createRecord();

      await expect(
        service.addPhoto(STRANGER, created.id, "2026-08-15", photo),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("findPhoto / removePhoto", () => {
    const photo = Buffer.from("이미지 바이트");

    it("올린 사진을 다시 받아오고 지울 수 있다", async () => {
      const created = await createRecord();
      const saved = await service.addPhoto(
        OWNER,
        created.id,
        "2026-08-15",
        photo,
      );

      const served = await service.findPhoto(
        OWNER,
        created.id,
        "2026-08-15",
        saved.id,
      );
      expect(served.mimeType).toBe("image/jpeg");

      await service.removePhoto(OWNER, created.id, "2026-08-15", saved.id);
      await expect(
        service.findPhoto(OWNER, created.id, "2026-08-15", saved.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("타인은 남의 사진을 받아갈 수 없다 (404)", async () => {
      const created = await createRecord();
      const saved = await service.addPhoto(
        OWNER,
        created.id,
        "2026-08-15",
        photo,
      );

      await expect(
        service.findPhoto(STRANGER, created.id, "2026-08-15", saved.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("removeEntry", () => {
    it("해당 일차의 일기를 지운다", async () => {
      const created = await createRecord();
      await service.upsertEntry(OWNER, created.id, "2026-08-15", {
        content: "첫째 날",
        source: "USER",
      });

      await service.removeEntry(OWNER, created.id, "2026-08-15");

      const detail = await service.findOne(OWNER, created.id);
      expect(detail.days).toEqual([]);
    });

    it("없는 일기면 404", async () => {
      const created = await createRecord();

      await expect(
        service.removeEntry(OWNER, created.id, "2026-08-15"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
