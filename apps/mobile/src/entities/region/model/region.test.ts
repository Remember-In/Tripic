import { describe, expect, it } from "vitest";

import {
  collectVisitedAreaCodes,
  collectVisitedCityCountyKeys,
  collectVisitedSigunguKeys,
  createKtoSigunguKey,
  KTO_REGIONS,
  summarizeRegionVisits,
  TOTAL_TRAVEL_CITY_COUNTY_COUNT,
} from "./region";

describe("region progress", () => {
  it("keeps only official TourAPI area codes", () => {
    expect([...collectVisitedAreaCodes(["1", "35", "999", null])]).toEqual([
      "1",
      "35",
    ]);
  });

  it("counts repeat visits without inflating visited regions", () => {
    const summary = summarizeRegionVisits(["1", "1", "35"]);

    expect(summary.visitCountByAreaCode["1"]).toBe(2);
    expect(summary.visitedRegionCount).toBe(2);
    expect(summary.totalRegionCount).toBe(17);
  });

  it("provides each of the 17 TourAPI regions once", () => {
    const areaCodes = KTO_REGIONS.map((region) => region.areaCode);

    expect(KTO_REGIONS).toHaveLength(17);
    expect(new Set(areaCodes).size).toBe(17);
  });

  it("keeps the travel map city and county denominator explicit", () => {
    expect(TOTAL_TRAVEL_CITY_COUNTY_COUNT).toBe(157);
  });

  it("builds unique sigungu progress keys only from valid area codes", () => {
    expect(createKtoSigunguKey("4", "7")).toBe("4:7");
    expect(createKtoSigunguKey("999", "7")).toBeNull();
    expect(createKtoSigunguKey("4", " ")).toBeNull();

    expect([
      ...collectVisitedSigunguKeys([
        { areaCode: "4", sigunguCode: "7" },
        { areaCode: "4", sigunguCode: "7" },
        { areaCode: "1", sigunguCode: "11" },
        { areaCode: "999", sigunguCode: "1" },
      ]),
    ]).toEqual(["4:7", "1:11"]);
  });

  it("counts only cities and counties in the 157-region progress", () => {
    expect([
      ...collectVisitedCityCountyKeys([
        { areaCode: "1", sigunguCode: "11" }, // 서울 동대문구
        { areaCode: "2", sigunguCode: "1" }, // 인천 강화군
        { areaCode: "4", sigunguCode: "7" }, // 대구 수성구
        { areaCode: "4", sigunguCode: "9" }, // 대구 군위군
        { areaCode: "31", sigunguCode: "1" }, // 경기 가평군
        { areaCode: "31", sigunguCode: "1" },
        { areaCode: "39", sigunguCode: "4" }, // 제주 행정시
      ]),
    ]).toEqual(["2:1", "4:9", "31:1"]);
  });

  it("accepts exactly 157 current city and county codes", () => {
    const potentialCodes = KTO_REGIONS.flatMap(({ areaCode }) =>
      Array.from({ length: 31 }, (_, index) => ({
        areaCode,
        sigunguCode: String(index + 1),
      })),
    );

    expect(collectVisitedCityCountyKeys(potentialCodes).size).toBe(157);
    expect(
      collectVisitedCityCountyKeys([
        { areaCode: "33", sigunguCode: "8" },
        { areaCode: "33", sigunguCode: "10" },
        { areaCode: "34", sigunguCode: "9" },
        { areaCode: "34", sigunguCode: "11" },
        { areaCode: "35", sigunguCode: "4" },
        { areaCode: "35", sigunguCode: "23" },
        { areaCode: "36", sigunguCode: "16" },
        { areaCode: "38", sigunguCode: "13" },
        { areaCode: "38", sigunguCode: "16" },
        { areaCode: "38", sigunguCode: "24" },
      ]).size,
    ).toBe(10);
    expect(
      collectVisitedCityCountyKeys([
        { areaCode: "33", sigunguCode: "9" }, // 폐지된 청원군
        { areaCode: "34", sigunguCode: "10" }, // 미반환 코드
        { areaCode: "35", sigunguCode: "5" }, // 옛 군위군 코드
        { areaCode: "36", sigunguCode: "6" }, // 폐지된 마산시
        { areaCode: "36", sigunguCode: "11" }, // 미반환 코드
        { areaCode: "36", sigunguCode: "14" }, // 폐지된 진해시
        { areaCode: "38", sigunguCode: "14" }, // 미반환 코드
        { areaCode: "38", sigunguCode: "15" }, // 미반환 코드
        { areaCode: "8", sigunguCode: "1" }, // 세종 단층제
        { areaCode: "39", sigunguCode: "3" }, // 제주 행정시
      ]).size,
    ).toBe(0);
  });
});
