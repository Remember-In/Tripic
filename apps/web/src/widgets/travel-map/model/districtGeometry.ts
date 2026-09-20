import generatedGeometry from "../../../../../mobile/src/widgets/travel-map/model/districtGeometry.generated.json";

export type DistrictGeometry = Readonly<{
  focusViewBox: string;
  labelX: number;
  labelY: number;
  name: string;
  path: string;
  sigunguCode: string | null;
}>;

export type DistrictMapGeometry = Readonly<{
  areaCode: string;
  districts: readonly DistrictGeometry[];
  labelFontSize: number;
  viewBox: string;
}>;

type GeneratedGeometry = Readonly<{
  maps: readonly DistrictMapGeometry[];
}>;

const geometry = generatedGeometry as unknown as GeneratedGeometry;
const mapsByAreaCode = new Map(
  geometry.maps.map((map) => [map.areaCode, map] as const),
);

export function getDistrictMap(areaCode: string) {
  return mapsByAreaCode.get(areaCode);
}

export function getDistrict(areaCode: string, sigunguCode: string | undefined) {
  return getDistrictMap(areaCode)?.districts.find(
    (district) => district.sigunguCode === sigunguCode,
  );
}
