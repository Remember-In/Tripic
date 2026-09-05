import { describe, expect, it, vi } from "vitest";

import type {
  CreateLocalTravelRecordInput,
  LocalRecordOwnerKey,
  LocalTravelRecord,
} from "@/entities/travel-record";

import {
  saveLocalRecordDraft,
  type SaveLocalRecordDraftDependencies,
  type SaveLocalRecordDraftInput,
} from "./saveLocalRecordDraft";

const savedAt = "2026-08-11T09:00:00.000Z";

const draft: SaveLocalRecordDraftInput = {
  notesByDate: {
    "2026-08-10": "첫날",
    "2026-08-11": "둘째 날",
  },
  ownerKey: "guest",
  photos: [
    {
      assetId: "asset-later",
      date: "2026-08-11",
      dimensions: { height: 1_200, width: 1_600 },
      place: {
        address: "경상북도 경주시",
        areaCode: "35",
        categoryCode: "A02",
        confidence: "MANUAL",
        contentId: "place-later",
        matchMethod: "MANUAL_SEARCH",
        name: "불국사",
        sigunguCode: "2",
      },
      sourceUri: "file:///picker/later.jpg",
    },
    {
      date: "2026-08-10",
      dimensions: { height: 2_400, width: 1_800 },
      place: {
        address: "서울특별시 종로구",
        areaCode: "1",
        confidence: "HIGH",
        contentId: "place-earlier",
        matchMethod: "GPS_CANDIDATE",
        name: "경복궁",
        sigunguCode: "23",
      },
      sourceUri: "file:///picker/earlier.jpg",
    },
  ],
  style: "EMOTIONAL_ESSAY",
  tags: ["#가을"],
  theme: "HISTORY_CULTURE",
  title: "두 도시 여행",
};

function toSavedRecord(input: CreateLocalTravelRecordInput): LocalTravelRecord {
  return {
    ...input,
    createdAt: savedAt,
    days: input.days.map((day) => ({
      ...day,
      note: day.note ?? null,
      photos: day.photos.map((photo) => ({
        id: photo.id,
        localAssetId: photo.localAssetId ?? null,
        localUri: photo.localUri ?? null,
      })),
      visits: day.visits.map((visit) => ({
        ...visit,
        categoryCode: visit.categoryCode ?? null,
        createdAt: savedAt,
        photoId: visit.photoId ?? null,
        sigunguCode: visit.sigunguCode ?? null,
        updatedAt: savedAt,
        userConfirmed: true,
        visitedAt: visit.visitedAt ?? `${day.date}T00:00:00.000Z`,
      })),
    })),
    style: input.style ?? null,
    tags: input.tags ?? [],
    theme: input.theme ?? null,
    updatedAt: savedAt,
  };
}

function createDependencies() {
  const events: string[] = [];
  const cleanupStagedPhotos = vi.fn(async () => {
    events.push("cleanup");
  });
  const copyPhoto = vi.fn(async (sourceUri: string, photoId: string) => {
    events.push(`copy:${sourceUri}:${photoId}`);
  });
  const createRecord = vi.fn(async (input: CreateLocalTravelRecordInput) => {
    events.push("create");
    return toSavedRecord(input);
  });
  const stagePhotoCleanup = vi.fn(
    async (_ownerKey: LocalRecordOwnerKey, _localUris: readonly string[]) => {
      events.push("stage");
    },
  );
  const dependencies: SaveLocalRecordDraftDependencies = {
    cleanupStagedPhotos,
    copyPhoto,
    createRecordId: () => "record-fixed",
    repository: { createRecord, stagePhotoCleanup },
    targetPhotoUri: (photoId) => `file:///records/${photoId}.jpg`,
  };

  return {
    cleanupStagedPhotos,
    copyPhoto,
    createRecord,
    dependencies,
    events,
    stagePhotoCleanup,
  };
}

describe("save local record draft", () => {
  it("stages every destination before copying and persists sorted days", async () => {
    const mocks = createDependencies();

    const record = await saveLocalRecordDraft(draft, mocks.dependencies);

    expect(mocks.events).toEqual([
      "stage",
      "copy:file:///picker/later.jpg:record-fixed-photo-1",
      "copy:file:///picker/earlier.jpg:record-fixed-photo-2",
      "create",
    ]);
    expect(mocks.stagePhotoCleanup).toHaveBeenCalledWith("guest", [
      "file:///records/record-fixed-photo-1.jpg",
      "file:///records/record-fixed-photo-2.jpg",
    ]);

    const createInput = mocks.createRecord.mock.calls[0]?.[0];
    expect(createInput?.days.map((day) => day.date)).toEqual([
      "2026-08-10",
      "2026-08-11",
    ]);
    expect(createInput?.days[0]).toMatchObject({
      id: "record-fixed-day-1",
      note: "첫날",
      photos: [
        {
          id: "record-fixed-photo-2",
          localAssetId: null,
          localUri: "file:///records/record-fixed-photo-2.jpg",
        },
      ],
      visits: [
        {
          areaCode: "1",
          contentId: "place-earlier",
          id: "record-fixed-day-1-visit-1",
          photoId: "record-fixed-photo-2",
          visitedAt: "2026-08-10T12:00:00.000Z",
        },
      ],
    });
    expect(record.id).toBe("record-fixed");
    expect(mocks.cleanupStagedPhotos).not.toHaveBeenCalled();
  });

  it("flushes every staged destination when a photo copy fails", async () => {
    const mocks = createDependencies();
    mocks.copyPhoto.mockRejectedValueOnce(new Error("copy failed"));

    await expect(
      saveLocalRecordDraft(draft, mocks.dependencies),
    ).rejects.toThrow("copy failed");

    expect(mocks.stagePhotoCleanup).toHaveBeenCalledOnce();
    expect(mocks.cleanupStagedPhotos).toHaveBeenCalledWith("guest");
    expect(mocks.createRecord).not.toHaveBeenCalled();
  });

  it("does not clean committed record photos after SQLite succeeds", async () => {
    const mocks = createDependencies();

    await saveLocalRecordDraft(draft, mocks.dependencies);

    const stagedUris = mocks.stagePhotoCleanup.mock.calls[0]?.[1];
    const storedUris = mocks.createRecord.mock.calls[0]?.[0].days.flatMap(
      (day) => day.photos.map((photo) => photo.localUri),
    );
    expect([...(storedUris ?? [])].sort()).toEqual(
      [...(stagedUris ?? [])].sort(),
    );
    expect(mocks.cleanupStagedPhotos).not.toHaveBeenCalled();
  });
});
