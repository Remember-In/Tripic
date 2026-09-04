import { describe, expect, it } from "vitest";

import type { LocalTravelRecord } from "@/entities/travel-record";

import { buildRecordPlaceUpdate } from "./updateRecordPlace";

const record: LocalTravelRecord = {
  createdAt: "2026-08-11T00:00:00.000Z",
  days: [
    {
      date: "2026-08-11",
      id: "day-1",
      note: null,
      photos: [
        {
          id: "photo-1",
          localAssetId: "asset-1",
          localUri: "file:///photo-1.jpg",
        },
      ],
      visits: [
        {
          areaCode: "35",
          categoryCode: "A",
          contentId: "old-place",
          createdAt: "2026-08-11T00:00:00.000Z",
          id: "visit-1",
          matchConfidence: "MANUAL",
          matchMethod: "MANUAL_SEARCH",
          photoId: "photo-1",
          sigunguCode: "2",
          updatedAt: "2026-08-11T00:00:00.000Z",
          userConfirmed: true,
          visitedAt: "2026-08-11T12:34:56.000Z",
        },
      ],
    },
  ],
  id: "record-1",
  ownerKey: "guest",
  style: null,
  tags: [],
  theme: null,
  title: "여행",
  updatedAt: "2026-08-11T00:00:00.000Z",
};

describe("record place update", () => {
  it("moves the linked photo and visit while preserving the local file", () => {
    const updated = buildRecordPlaceUpdate(
      record,
      "visit-1",
      "2026-08-12",
      null,
    );

    expect(updated.days).toHaveLength(1);
    expect(updated.days[0]?.date).toBe("2026-08-12");
    expect(updated.days[0]?.photos[0]?.localUri).toBe("file:///photo-1.jpg");
    expect(updated.days[0]?.visits[0]?.visitedAt).toBe(
      "2026-08-12T12:34:56.000Z",
    );
  });

  it("replaces only the selected tourist metadata", () => {
    const updated = buildRecordPlaceUpdate(record, "visit-1", "2026-08-11", {
      address: "서울특별시 종로구",
      areaCode: "1",
      confidence: "MANUAL",
      contentId: "new-place",
      matchMethod: "MANUAL_SEARCH",
      name: "경복궁",
      sigunguCode: "23",
    });

    expect(updated.days[0]?.visits[0]).toMatchObject({
      areaCode: "1",
      contentId: "new-place",
      photoId: "photo-1",
      sigunguCode: "23",
    });
  });
});
