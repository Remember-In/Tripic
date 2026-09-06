import { describe, expect, it } from "vitest";

import { KTO_REGIONS } from "@/entities/region";

import {
  getDistrictByCode,
  getDistrictMap,
  getDistrictViewBox,
} from "./districtGeometry";
import { KOREA_SCHEMATIC_GEOMETRY } from "./koreaSchematicGeometry";
import {
  COUNTRY_MAP_DEPTH,
  INITIAL_TRAVEL_MAP_HISTORY,
  areaMapDepth,
  currentMapDepth,
  goBackMapHistory,
  mapDepthLabel,
  navigateMapHistory,
  previousMapDepth,
  sigunguMapDepth,
} from "./travelMapState";

describe("travel map geometry", () => {
  it("maps every TourAPI area code to exactly one schematic province path", () => {
    const geometryCodes = KOREA_SCHEMATIC_GEOMETRY.map(
      (geometry) => geometry.areaCode,
    );

    expect(geometryCodes).toHaveLength(KTO_REGIONS.length);
    expect(new Set(geometryCodes).size).toBe(KTO_REGIONS.length);
    expect(new Set(geometryCodes)).toEqual(
      new Set(KTO_REGIONS.map((region) => region.areaCode)),
    );
  });

  it("provides a district map for every TourAPI area code", () => {
    KTO_REGIONS.forEach((region) => {
      const districtMap = getDistrictMap(region.areaCode);

      expect(districtMap?.areaCode).toBe(region.areaCode);
      expect(districtMap?.viewBox.split(" ").map(Number)).toHaveLength(4);
      expect(districtMap?.districts.length).toBeGreaterThan(0);
    });
  });

  it("gives every selectable district a unique code inside its area", () => {
    KTO_REGIONS.forEach((region) => {
      const districts = getDistrictMap(region.areaCode)?.districts ?? [];
      const selectableCodes = districts.flatMap((district) =>
        district.sigunguCode ? [district.sigunguCode] : [],
      );

      expect(new Set(selectableCodes).size).toBe(selectableCodes.length);
      districts.forEach((district) => {
        expect(district.path.length).toBeGreaterThan(0);
        expect(district.focusViewBox.split(" ").map(Number)).toHaveLength(4);
      });
    });
  });

  it("connects TourAPI district codes to focused boundary view boxes", () => {
    expect(getDistrictByCode("4", "7")?.name).toBe("수성구");
    expect(getDistrictViewBox("4", "7")).toBe(
      getDistrictByCode("4", "7")?.focusViewBox,
    );
    expect(getDistrictViewBox("4", "unknown")).toBe(
      getDistrictMap("4")?.viewBox,
    );
  });

  it("keeps Sejong at area depth because TourAPI has no sigungu level", () => {
    expect(getDistrictMap("8")?.districts).toEqual(
      expect.arrayContaining([expect.objectContaining({ sigunguCode: null })]),
    );
  });
});

describe("travel map depth", () => {
  it("creates labels at country, area and sigungu depth", () => {
    expect(mapDepthLabel(COUNTRY_MAP_DEPTH)).toBe("대한민국");
    expect(mapDepthLabel(areaMapDepth("35"))).toBe("경상북도");
    expect(mapDepthLabel(areaMapDepth("4"))).toBe("대구광역시");
    expect(mapDepthLabel(sigunguMapDepth("4", "7"))).toBe("대구광역시 수성구");
  });

  it("returns a sigungu to the area it belongs to", () => {
    expect(previousMapDepth(sigunguMapDepth("4", "7"))).toEqual(
      areaMapDepth("4"),
    );
    expect(previousMapDepth(sigunguMapDepth("1", "1"))).toEqual(
      areaMapDepth("1"),
    );
    expect(previousMapDepth(areaMapDepth("4"))).toEqual(COUNTRY_MAP_DEPTH);
    expect(previousMapDepth(areaMapDepth("35"))).toEqual(COUNTRY_MAP_DEPTH);
  });

  it("returns through the path the user actually followed", () => {
    const throughSuseong = navigateMapHistory(
      navigateMapHistory(INITIAL_TRAVEL_MAP_HISTORY, areaMapDepth("4")),
      sigunguMapDepth("4", "7"),
    );

    const daegu = goBackMapHistory(throughSuseong);
    const country = goBackMapHistory(daegu);

    expect(currentMapDepth(daegu)).toEqual(areaMapDepth("4"));
    expect(currentMapDepth(country)).toEqual(COUNTRY_MAP_DEPTH);

    const directDaegu = navigateMapHistory(
      INITIAL_TRAVEL_MAP_HISTORY,
      areaMapDepth("4"),
    );
    expect(currentMapDepth(goBackMapHistory(directDaegu))).toEqual(
      COUNTRY_MAP_DEPTH,
    );
    expect(navigateMapHistory(directDaegu, areaMapDepth("4"))).toBe(
      directDaegu,
    );
  });

  it("replaces a sibling district so one back action returns to its area", () => {
    const gangnam = navigateMapHistory(
      navigateMapHistory(INITIAL_TRAVEL_MAP_HISTORY, areaMapDepth("1")),
      sigunguMapDepth("1", "1"),
    );
    const seocho = navigateMapHistory(gangnam, sigunguMapDepth("1", "15"));

    expect(currentMapDepth(seocho)).toEqual(sigunguMapDepth("1", "15"));
    expect(currentMapDepth(goBackMapHistory(seocho))).toEqual(
      areaMapDepth("1"),
    );
  });
});
