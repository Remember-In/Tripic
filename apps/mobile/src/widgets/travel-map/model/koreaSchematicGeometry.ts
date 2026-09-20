import southKoreaMapData from "@svg-maps/south-korea";

import type { KtoAreaCode } from "@/entities/region";

type SvgMapLocation = Readonly<{
  id: string;
  path: string;
}>;

type SvgMap = Readonly<{
  locations: readonly SvgMapLocation[];
  viewBox: string;
}>;

const southKoreaMap = southKoreaMapData as unknown as SvgMap;

export const KOREA_MAP_VIEW_BOX = southKoreaMap.viewBox;

export type RegionGeometry = Readonly<{
  areaCode: KtoAreaCode;
  path: string;
}>;

const AREA_CODE_BY_LOCATION_ID = {
  busan: "6",
  daegu: "4",
  daejeon: "3",
  gangwon: "32",
  gwangju: "5",
  gyeonggi: "31",
  incheon: "2",
  jeju: "39",
  "north-chungcheong": "33",
  "north-gyeongsang": "35",
  "north-jeolla": "37",
  sejong: "8",
  seoul: "1",
  "south-chungcheong": "34",
  "south-gyeongsang": "36",
  "south-jeolla": "38",
  ulsan: "7",
} as const satisfies Record<string, KtoAreaCode>;

/** 실제 대한민국 광역 시·도 경계 데이터다. */
export const KOREA_SCHEMATIC_GEOMETRY = southKoreaMap.locations.flatMap(
  (location) => {
    const areaCode =
      AREA_CODE_BY_LOCATION_ID[
        location.id as keyof typeof AREA_CODE_BY_LOCATION_ID
      ];

    return areaCode ? [{ areaCode, path: location.path }] : [];
  },
) satisfies readonly RegionGeometry[];
