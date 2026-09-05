import { describe, expect, it } from "vitest";

import type { LocalTravelRecord } from "@/entities/travel-record";

import { removeRecordPhoto } from "./removeRecordPhoto";

function makeRecord(): LocalTravelRecord {
  return {
    createdAt: "2026-09-04T00:00:00.000Z",
    days: [
      {
        date: "2026-09-04",
        id: "day-1",
        note: "남겨야 하는 메모",
        photos: [{ id: "photo-1", localAssetId: null, localUri: "file://1" }],
        visits: [
          {
            areaCode: "1",
            categoryCode: null,
            contentId: "linked",
            createdAt: "2026-09-04T00:00:00.000Z",
            id: "visit-linked",
            matchConfidence: "HIGH",
            matchMethod: "GPS_CANDIDATE",
            photoId: "photo-1",
            sigunguCode: null,
            updatedAt: "2026-09-04T00:00:00.000Z",
            userConfirmed: true,
            visitedAt: "2026-09-04T00:00:00.000Z",
          },
          {
            areaCode: "1",
            categoryCode: null,
            contentId: "unlinked",
            createdAt: "2026-09-04T00:00:00.000Z",
            id: "visit-unlinked",
            matchConfidence: "MANUAL",
            matchMethod: "MANUAL_SEARCH",
            photoId: null,
            sigunguCode: null,
            updatedAt: "2026-09-04T00:00:00.000Z",
            userConfirmed: true,
            visitedAt: "2026-09-04T00:00:00.000Z",
          },
        ],
      },
    ],
    id: "record-1",
    ownerKey: "guest",
    style: null,
    tags: [],
    theme: null,
    title: "서울 여행",
    updatedAt: "2026-09-04T00:00:00.000Z",
  };
}

describe("removeRecordPhoto", () => {
  it("keeps the day note and unrelated visit when its last photo is removed", () => {
    const [day] = removeRecordPhoto(makeRecord(), "day-1", "photo-1");

    expect(day.note).toBe("남겨야 하는 메모");
    expect(day.photos).toEqual([]);
    expect(day.visits.map((visit) => visit.id)).toEqual(["visit-unlinked"]);
  });

  it("removes an empty day after its last photo and linked visit are removed", () => {
    const record = makeRecord();
    const emptyAfterRemoval: LocalTravelRecord = {
      ...record,
      days: [
        {
          ...record.days[0],
          note: null,
          visits: [record.days[0].visits[0]],
        },
      ],
    };

    expect(removeRecordPhoto(emptyAfterRemoval, "day-1", "photo-1")).toEqual(
      [],
    );
  });
});
