import { describe, expect, it } from "vitest";
import {
  createRecordPlaceSchema,
  updateRecordPlaceSchema,
} from "@tripic/shared";

/**
 * 방문 관광지 요청 계약 (docs/16 §2.1·§4.2).
 * 라우트가 이 스키마를 그대로 쓰므로 여기서 통과/거부가 곧 400 여부가 된다.
 */
describe("createRecordPlaceSchema", () => {
  const valid = { contentId: "126508", visitedAt: "2026-09-20" };

  it("contentId 와 방문일이 있으면 통과한다", () => {
    expect(createRecordPlaceSchema.parse(valid)).toEqual(valid);
  });

  it("contentId 는 숫자 문자열만 받는다", () => {
    expect(
      createRecordPlaceSchema.safeParse({ ...valid, contentId: "12a" }).success,
    ).toBe(false);
    expect(
      createRecordPlaceSchema.safeParse({ ...valid, contentId: "" }).success,
    ).toBe(false);
  });

  it("방문일은 YYYY-MM-DD 만 받는다 — 시각은 받지 않는다", () => {
    expect(
      createRecordPlaceSchema.safeParse({
        ...valid,
        visitedAt: "2026-09-20T00:00:00.000Z",
      }).success,
    ).toBe(false);
    expect(
      createRecordPlaceSchema.safeParse({ ...valid, visitedAt: "2026-9-20" })
        .success,
    ).toBe(false);
  });

  it("달력에 없는 날짜는 거부한다", () => {
    expect(
      createRecordPlaceSchema.safeParse({ ...valid, visitedAt: "2026-02-30" })
        .success,
    ).toBe(false);
  });

  /**
   * zod 는 기본이 strip 이라 모르는 키를 조용히 버린다.
   * 좌표가 서버에 닿는 것 자체를 막아야 하므로 strict 로 거부한다 (docs/16 §4.2).
   */
  it.each([
    ["latitude", { latitude: 37.5 }],
    ["longitude", { longitude: 127.0 }],
    ["gps", { gps: { latitude: 37.5, longitude: 127.0 } }],
    ["exif", { exif: { GPSLatitude: 37.5 } }],
    ["areaCode", { areaCode: "1" }],
    ["sigunguCode", { sigunguCode: "23" }],
  ])("%s 를 함께 보내면 거부한다", (_name, extra) => {
    expect(
      createRecordPlaceSchema.safeParse({ ...valid, ...extra }).success,
    ).toBe(false);
  });
});

describe("updateRecordPlaceSchema", () => {
  it("contentId 만 보내도 통과한다", () => {
    expect(updateRecordPlaceSchema.parse({ contentId: "126508" })).toEqual({
      contentId: "126508",
    });
  });

  it("visitedAt 만 보내도 통과한다", () => {
    expect(updateRecordPlaceSchema.parse({ visitedAt: "2026-09-21" })).toEqual({
      visitedAt: "2026-09-21",
    });
  });

  it("빈 본문은 거부한다 — 바꿀 것이 없다", () => {
    expect(updateRecordPlaceSchema.safeParse({}).success).toBe(false);
  });

  it("좌표·지역코드를 함께 보내면 거부한다", () => {
    expect(
      updateRecordPlaceSchema.safeParse({
        visitedAt: "2026-09-21",
        latitude: 37.5,
      }).success,
    ).toBe(false);
    expect(
      updateRecordPlaceSchema.safeParse({
        visitedAt: "2026-09-21",
        areaCode: "1",
      }).success,
    ).toBe(false);
  });
});
