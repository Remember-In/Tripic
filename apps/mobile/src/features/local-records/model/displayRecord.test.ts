import { describe, expect, it } from "vitest";

import type { LocalTravelRecord } from "@/entities/travel-record";

import { mapLocalRecordToDisplay } from "./displayRecord";

const record: LocalTravelRecord = {
  createdAt: "2026-08-11T09:00:00.000Z",
  days: [
    {
      date: "2026-08-11",
      id: "day-1",
      note: "여행 메모",
      photos: [
        {
          id: "photo-1",
          localAssetId: null,
          localUri: "file:///tripic/photo-1.jpg",
        },
      ],
      visits: [
        {
          areaCode: "35",
          categoryCode: "A02020600",
          contentId: "125266",
          createdAt: "2026-08-11T09:00:00.000Z",
          id: "visit-1",
          matchConfidence: "MANUAL",
          matchMethod: "MANUAL_SEARCH",
          photoId: "photo-1",
          sigunguCode: "2",
          updatedAt: "2026-08-11T09:00:00.000Z",
          userConfirmed: true,
          visitedAt: "2026-08-11T12:00:00.000Z",
        },
      ],
    },
  ],
  id: "record-1",
  ownerKey: "guest",
  style: "EMOTIONAL_ESSAY",
  tags: ["#경주"],
  theme: "HISTORY_CULTURE",
  title: "경주 여행",
  updatedAt: "2026-08-11T09:00:00.000Z",
};

describe("local record display mapping", () => {
  it("combines live tourist metadata with local record and photo", () => {
    const display = mapLocalRecordToDisplay(record, {
      address: "경상북도 경주시",
      name: "불국사",
    });

    expect(display.title).toBe("경주 여행");
    expect(display.days[0]?.photos).toEqual([
      { uri: "file:///tripic/photo-1.jpg" },
    ]);
    expect(display.place.name).toBe("불국사");
    expect(display.place.region).toBe("경북");
    expect(display.place.visitDate).toBe("2026.08.11");
  });
});
