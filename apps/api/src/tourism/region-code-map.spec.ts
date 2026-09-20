import { describe, expect, it } from "vitest";

import {
  getLegalAreaCode,
  getLegalDistrictCodes,
  resolveKtoRegionCodes,
} from "@/tourism/region-code-map";

/**
 * 모바일 `apps/mobile/src/shared/api/kto/regionCodeMap.test.ts` 에서 이식한 계약이다.
 * 두 사본이 같은 매핑을 유지하는지 고정한다 (docs/15 §4).
 */
describe("KorService2 legal region code mapping", () => {
  it("maps all supported province codes to the legal-district system", () => {
    const expected = [
      ["1", "11"],
      ["2", "28"],
      ["3", "30"],
      ["4", "27"],
      ["5", "12"],
      ["6", "26"],
      ["7", "31"],
      ["8", "36"],
      ["31", "41"],
      ["32", "51"],
      ["33", "43"],
      ["34", "44"],
      ["35", "47"],
      ["36", "48"],
      ["37", "52"],
      ["38", "12"],
      ["39", "50"],
    ];

    expect(
      expected.map(([legacy]) => [legacy, getLegalAreaCode(legacy)]),
    ).toEqual(expected);
  });

  it("maps a legal district to the legacy progress key", () => {
    expect(
      resolveKtoRegionCodes({
        legalAreaCode: "11",
        legalSigunguCode: "680",
      }),
    ).toMatchObject({ areaCode: "1", sigunguCode: "1" });
  });

  it("splits the shared Gwangju-Jeonnam legal area by full district code", () => {
    expect(
      resolveKtoRegionCodes({
        legalAreaCode: "12",
        legalSigunguCode: "210",
      }),
    ).toMatchObject({ areaCode: "5", sigunguCode: "3" });
    expect(
      resolveKtoRegionCodes({
        legalAreaCode: "12",
        legalSigunguCode: "170",
      }),
    ).toMatchObject({ areaCode: "38", sigunguCode: "6" });
    expect(resolveKtoRegionCodes({ legalAreaCode: "12" })).toMatchObject({
      areaCode: "",
      sigunguCode: undefined,
    });
  });

  it("maps the current Incheon districts to stable progress keys", () => {
    expect(
      resolveKtoRegionCodes({
        legalAreaCode: "28",
        legalSigunguCode: "125",
      }),
    ).toMatchObject({ areaCode: "2", sigunguCode: "125" });
    expect(getLegalDistrictCodes("2", "290")).toEqual(["290"]);
  });

  it("combines every general-gu code under its parent city", () => {
    expect(getLegalDistrictCodes("31", "13")).toEqual([
      "111",
      "113",
      "115",
      "117",
    ]);
    expect(
      resolveKtoRegionCodes({
        legalAreaCode: "41",
        legalSigunguCode: "115",
      }),
    ).toMatchObject({ areaCode: "31", sigunguCode: "13" });
  });

  it("keeps legacy fields as a fallback for a new unmapped district", () => {
    expect(
      resolveKtoRegionCodes({
        areaCode: "2",
        legalAreaCode: "28",
        legalSigunguCode: "999",
        sigunguCode: "10",
      }),
    ).toMatchObject({ areaCode: "2", sigunguCode: "10" });
  });
});
