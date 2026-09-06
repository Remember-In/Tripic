import { getRegionByAreaCode, type KtoAreaCode } from "@/entities/region";

import { getDistrictByCode } from "./districtGeometry";

export type TravelMapDepth =
  | Readonly<{ level: "country" }>
  | Readonly<{ areaCode: KtoAreaCode; level: "area" }>
  | Readonly<{
      areaCode: KtoAreaCode;
      level: "sigungu";
      sigunguCode: string;
    }>;

export const COUNTRY_MAP_DEPTH: TravelMapDepth = { level: "country" };

export type TravelMapHistory = readonly TravelMapDepth[];

export const INITIAL_TRAVEL_MAP_HISTORY: TravelMapHistory = [COUNTRY_MAP_DEPTH];

export function areaMapDepth(areaCode: KtoAreaCode): TravelMapDepth {
  return { areaCode, level: "area" };
}

export function sigunguMapDepth(
  areaCode: KtoAreaCode,
  sigunguCode: string,
): TravelMapDepth {
  return { areaCode, level: "sigungu", sigunguCode };
}

export function previousMapDepth(depth: TravelMapDepth): TravelMapDepth {
  if (depth.level === "sigungu") {
    return areaMapDepth(depth.areaCode);
  }

  return COUNTRY_MAP_DEPTH;
}

export function currentMapDepth(history: TravelMapHistory): TravelMapDepth {
  return history[history.length - 1] ?? COUNTRY_MAP_DEPTH;
}

export function navigateMapHistory(
  history: TravelMapHistory,
  depth: TravelMapDepth,
): TravelMapHistory {
  const currentDepth = currentMapDepth(history);
  const isSameDepth =
    currentDepth.level === depth.level &&
    (depth.level === "country" ||
      (currentDepth.level !== "country" &&
        currentDepth.areaCode === depth.areaCode &&
        (depth.level === "area" ||
          (currentDepth.level === "sigungu" &&
            currentDepth.sigunguCode === depth.sigunguCode))));

  if (isSameDepth) {
    return history;
  }

  if (
    currentDepth.level === "sigungu" &&
    depth.level === "sigungu" &&
    currentDepth.areaCode === depth.areaCode
  ) {
    return [...history.slice(0, -1), depth];
  }

  return [...history, depth];
}

export function goBackMapHistory(history: TravelMapHistory): TravelMapHistory {
  return history.length > 1 ? history.slice(0, -1) : history;
}

export function mapDepthLabel(depth: TravelMapDepth): string {
  if (depth.level === "country") {
    return "대한민국";
  }

  const region = getRegionByAreaCode(depth.areaCode);
  if (!region) {
    return "대한민국";
  }

  if (depth.level === "area") {
    return region.name;
  }

  const district = getDistrictByCode(depth.areaCode, depth.sigunguCode);
  return district ? `${region.name} ${district.name}` : region.name;
}
