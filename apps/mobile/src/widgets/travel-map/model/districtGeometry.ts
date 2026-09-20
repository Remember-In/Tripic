import type { KtoAreaCode } from "@/entities/region";

import generatedGeometry from "./districtGeometry.generated.json";

export type DistrictGeometry = Readonly<{
  /** 향후 TourAPI 법정동 코드 전환에 사용할 5자리 행정 시군구 코드다. */
  administrativeCodes: readonly string[];
  focusViewBox: string;
  labelX: number;
  labelY: number;
  name: string;
  path: string;
  /** 세종은 단층제라 TourAPI 시군구 코드가 없다. */
  sigunguCode: string | null;
}>;

export type DistrictMapGeometry = Readonly<{
  areaCode: KtoAreaCode;
  districts: readonly DistrictGeometry[];
  labelFontSize: number;
  viewBox: string;
}>;

export type DistrictGeometrySource = Readonly<{
  commit: string;
  date: string;
  sha256: string;
  url: string;
}>;

type GeneratedGeometry = Readonly<{
  maps: readonly DistrictMapGeometry[];
  source: DistrictGeometrySource;
}>;

const geometry = generatedGeometry as unknown as GeneratedGeometry;

export const DISTRICT_GEOMETRY_SOURCE = geometry.source;
export const DISTRICT_MAP_GEOMETRY = geometry.maps;

const districtMapsByAreaCode = new Map<KtoAreaCode, DistrictMapGeometry>(
  DISTRICT_MAP_GEOMETRY.map((map) => [map.areaCode, map]),
);

export function getDistrictMap(areaCode: KtoAreaCode) {
  return districtMapsByAreaCode.get(areaCode);
}

export function getDistrictByCode(areaCode: KtoAreaCode, sigunguCode: string) {
  return getDistrictMap(areaCode)?.districts.find(
    (district) => district.sigunguCode === sigunguCode,
  );
}

export function getDistrictViewBox(
  areaCode: KtoAreaCode,
  sigunguCode?: string,
) {
  const map = getDistrictMap(areaCode);
  if (!map) {
    return "0 0 800 800";
  }

  return sigunguCode
    ? (getDistrictByCode(areaCode, sigunguCode)?.focusViewBox ?? map.viewBox)
    : map.viewBox;
}
