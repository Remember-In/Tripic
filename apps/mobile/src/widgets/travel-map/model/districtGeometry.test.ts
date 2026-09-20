import { describe, expect, it } from "vitest";

import { KTO_REGIONS, createKtoSigunguKey } from "@/entities/region";

import {
  DISTRICT_GEOMETRY_SOURCE,
  DISTRICT_MAP_GEOMETRY,
  getDistrictByCode,
  getDistrictMap,
  getDistrictViewBox,
} from "./districtGeometry";

const EXPECTED_DISTRICT_COUNTS = {
  "1": 25,
  "2": 11,
  "3": 5,
  "4": 9,
  "5": 5,
  "6": 16,
  "7": 5,
  "8": 1,
  "31": 31,
  "32": 18,
  "33": 11,
  "34": 15,
  "35": 22,
  "36": 18,
  "37": 14,
  "38": 22,
  "39": 2,
} as const;

function parseViewBox(viewBox: string) {
  const [x, y, width, height] = viewBox.split(" ").map(Number);
  return { height, width, x, y };
}

describe("district geometry", () => {
  it("contains a detailed map for every supported TourAPI area", () => {
    expect(DISTRICT_MAP_GEOMETRY).toHaveLength(KTO_REGIONS.length);

    for (const region of KTO_REGIONS) {
      const map = getDistrictMap(region.areaCode);
      expect(map, region.name).toBeDefined();
      expect(map?.districts).toHaveLength(
        EXPECTED_DISTRICT_COUNTS[region.areaCode],
      );
      expect(map?.viewBox.split(" ").map(Number)).toHaveLength(4);
    }
  });

  it("maps 229 selectable districts without duplicate progress keys", () => {
    const keys = DISTRICT_MAP_GEOMETRY.flatMap((map) =>
      map.districts.flatMap((district) => {
        if (!district.sigunguCode) {
          return [];
        }
        const key = createKtoSigunguKey(map.areaCode, district.sigunguCode);
        return key ? [key] : [];
      }),
    );

    expect(keys).toHaveLength(229);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("retains every 2026 administrative district code for the TourAPI migration", () => {
    const administrativeCodes = DISTRICT_MAP_GEOMETRY.flatMap((map) =>
      map.districts.flatMap((district) => district.administrativeCodes),
    );

    expect(administrativeCodes).toHaveLength(256);
    expect(new Set(administrativeCodes).size).toBe(administrativeCodes.length);
  });

  it("includes current administrative changes and combines general-gu cities", () => {
    expect(getDistrictByCode("4", "9")?.name).toBe("군위군");
    expect(getDistrictByCode("2", "125")?.name).toBe("제물포구");
    expect(getDistrictByCode("2", "155")?.name).toBe("영종구");
    expect(getDistrictByCode("2", "275")?.name).toBe("서해구");
    expect(getDistrictByCode("2", "290")?.name).toBe("검단구");
    expect(getDistrictByCode("2", "5")).toBeUndefined();
    expect(getDistrictByCode("2", "7")).toBeUndefined();
    expect(getDistrictByCode("2", "10")).toBeUndefined();
    expect(getDistrictByCode("35", "5")).toBeUndefined();
    expect(getDistrictByCode("31", "13")?.name).toBe("수원시");
    expect(getDistrictByCode("36", "16")?.name).toBe("창원시");
  });

  it("uses a focused view box for any selected district", () => {
    expect(getDistrictViewBox("1", "1")).toBe(
      getDistrictByCode("1", "1")?.focusViewBox,
    );
    expect(getDistrictViewBox("39", "3")).toBe(
      getDistrictByCode("39", "3")?.focusViewBox,
    );
    expect(getDistrictViewBox("31", "missing")).toBe(
      getDistrictMap("31")?.viewBox,
    );
  });

  it("visibly zooms every selectable district instead of keeping the area view", () => {
    DISTRICT_MAP_GEOMETRY.forEach((map) => {
      const areaViewBox = parseViewBox(map.viewBox);

      map.districts.forEach((district) => {
        if (!district.sigunguCode) {
          return;
        }

        const focusViewBox = parseViewBox(district.focusViewBox);
        const renderedZoom = Math.min(
          areaViewBox.width / focusViewBox.width,
          areaViewBox.height / focusViewBox.height,
        );

        expect(
          renderedZoom,
          `${map.areaCode}:${district.sigunguCode} ${district.name}`,
        ).toBeGreaterThanOrEqual(1.27);
      });
    });
  });

  it("pins the generated source to the current snapshot", () => {
    expect(DISTRICT_GEOMETRY_SOURCE.date).toBe("2026-07-01");
    expect(DISTRICT_GEOMETRY_SOURCE.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
