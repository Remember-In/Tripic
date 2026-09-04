import { describe, expect, it, vi } from "vitest";

import { createSqliteLocalTravelRecordRepository } from "./localRecordRepository";

vi.mock("@/shared/lib/storage", () => ({
  openTripicDatabase: vi.fn(),
}));

const updateInput = {
  days: [
    {
      date: "2026-09-04",
      id: "day-1",
      note: "수정한 메모",
      photos: [],
      visits: [],
    },
  ],
  id: "record-1",
  style: null,
  tags: [],
  theme: null,
  title: "수정한 여행",
} as const;

function createDatabase(options: { failRecordRead?: boolean } = {}) {
  let inTransaction = false;
  let transactionCommitted = false;

  const database = {
    getAllAsync: vi.fn(async (query: string) => {
      if (!inTransaction) {
        throw new Error("트랜잭션 커밋 뒤에 읽기를 시도했습니다.");
      }

      if (query.includes("FROM local_record_days\n")) {
        return [
          {
            id: "day-1",
            note: "수정한 메모",
            visit_date: "2026-09-04",
          },
        ];
      }

      return [];
    }),
    getFirstAsync: vi.fn(async () => {
      if (!inTransaction) {
        throw new Error("트랜잭션 커밋 뒤에 읽기를 시도했습니다.");
      }
      if (options.failRecordRead) {
        throw new Error("수정 결과 읽기 실패");
      }

      return {
        created_at: "2026-09-01T00:00:00.000Z",
        id: "record-1",
        owner_key: "guest",
        style: null,
        theme: null,
        title: "수정한 여행",
        updated_at: "2026-09-04T00:00:00.000Z",
      };
    }),
    runAsync: vi.fn(async () => ({ changes: 1 })),
    withTransactionAsync: vi.fn(async (task: () => Promise<void>) => {
      inTransaction = true;
      try {
        await task();
        transactionCommitted = true;
      } finally {
        inTransaction = false;
      }
    }),
  };

  return {
    database: database as unknown as Parameters<
      typeof createSqliteLocalTravelRecordRepository
    >[0],
    transactionCommitted: () => transactionCommitted,
  };
}

describe("SqliteLocalTravelRecordRepository.updateRecord", () => {
  it("reads and returns the updated record before committing", async () => {
    const fake = createDatabase();
    const repository = createSqliteLocalTravelRecordRepository(
      fake.database,
      () => "2026-09-04T00:00:00.000Z",
    );

    await expect(
      repository.updateRecord("guest", updateInput),
    ).resolves.toEqual(
      expect.objectContaining({
        createdAt: "2026-09-01T00:00:00.000Z",
        id: "record-1",
        ownerKey: "guest",
        title: "수정한 여행",
        updatedAt: "2026-09-04T00:00:00.000Z",
      }),
    );
    expect(fake.transactionCommitted()).toBe(true);
  });

  it("does not commit when reading the updated result fails", async () => {
    const fake = createDatabase({ failRecordRead: true });
    const repository = createSqliteLocalTravelRecordRepository(
      fake.database,
      () => "2026-09-04T00:00:00.000Z",
    );

    await expect(repository.updateRecord("guest", updateInput)).rejects.toThrow(
      "수정 결과 읽기 실패",
    );
    expect(fake.transactionCommitted()).toBe(false);
  });
});
