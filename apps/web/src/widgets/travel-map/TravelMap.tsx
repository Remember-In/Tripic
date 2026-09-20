import southKoreaMapData from "@svg-maps/south-korea";
import { useMemo, useState } from "react";

import type { DistrictMapGeometry } from "./model/districtGeometry";

type MapLocation = { id: string; path: string };
type SouthKoreaMap = { locations: MapLocation[]; viewBox: string };

const southKoreaMap = southKoreaMapData as unknown as SouthKoreaMap;

const REGIONS = {
  busan: { areaCode: "6", label: "부산", x: 350, y: 415 },
  daegu: { areaCode: "4", label: "대구", x: 298, y: 346 },
  daejeon: { areaCode: "3", label: "대전", x: 195, y: 282 },
  gangwon: { areaCode: "32", label: "강원", x: 321, y: 125 },
  gwangju: { areaCode: "5", label: "광주", x: 139, y: 407 },
  gyeonggi: { areaCode: "31", label: "경기", x: 163, y: 154 },
  incheon: { areaCode: "2", label: "인천", x: 93, y: 163 },
  jeju: { areaCode: "39", label: "제주", x: 112, y: 613 },
  "north-chungcheong": { areaCode: "33", label: "충북", x: 241, y: 242 },
  "north-gyeongsang": { areaCode: "35", label: "경북", x: 323, y: 282 },
  "north-jeolla": { areaCode: "37", label: "전북", x: 177, y: 348 },
  sejong: { areaCode: "8", label: "세종", x: 189, y: 250 },
  seoul: { areaCode: "1", label: "서울", x: 137, y: 132 },
  "south-chungcheong": { areaCode: "34", label: "충남", x: 137, y: 271 },
  "south-gyeongsang": { areaCode: "36", label: "경남", x: 274, y: 412 },
  "south-jeolla": { areaCode: "38", label: "전남", x: 151, y: 467 },
  ulsan: { areaCode: "7", label: "울산", x: 383, y: 368 },
} as const;

const REGION_BY_AREA_CODE = new Map<
  string,
  (typeof REGIONS)[keyof typeof REGIONS]
>(Object.values(REGIONS).map((region) => [region.areaCode, region] as const));

type MapDepth =
  | { level: "country" }
  | { areaCode: string; level: "area" }
  | { areaCode: string; level: "sigungu"; sigunguCode: string };

type TravelMapProps = {
  visitedAreaCodes?: ReadonlySet<string>;
  visitedSigunguKeys?: ReadonlySet<string>;
};

const EMPTY_CODES: ReadonlySet<string> = new Set();

export function TravelMap({
  visitedAreaCodes = EMPTY_CODES,
  visitedSigunguKeys = EMPTY_CODES,
}: TravelMapProps) {
  const [depth, setDepth] = useState<MapDepth>({ level: "country" });
  const [districtMap, setDistrictMap] = useState<DistrictMapGeometry | null>(
    null,
  );
  const focusedDistrict =
    depth.level === "sigungu"
      ? districtMap?.districts.find(
          (district) => district.sigunguCode === depth.sigunguCode,
        )
      : undefined;
  const currentRegion =
    depth.level === "country"
      ? undefined
      : REGION_BY_AREA_CODE.get(depth.areaCode);

  const title = useMemo(() => {
    if (depth.level === "country") return "대한민국";
    if (depth.level === "area") return currentRegion?.label ?? "지역 지도";
    return `${currentRegion?.label ?? ""} ${focusedDistrict?.name ?? ""}`.trim();
  }, [currentRegion?.label, depth.level, focusedDistrict?.name]);

  const goBack = () => {
    if (depth.level === "sigungu") {
      setDepth({ areaCode: depth.areaCode, level: "area" });
      return;
    }
    setDepth({ level: "country" });
    setDistrictMap(null);
  };

  const openArea = async (areaCode: string) => {
    const { getDistrictMap } = await import("./model/districtGeometry");
    const nextMap = getDistrictMap(areaCode);
    if (!nextMap) return;
    setDistrictMap(nextMap);
    setDepth({ areaCode, level: "area" });
  };

  if (depth.level !== "country" && districtMap) {
    const districts = focusedDistrict
      ? [focusedDistrict]
      : districtMap.districts;
    const viewBox = focusedDistrict?.focusViewBox ?? districtMap.viewBox;

    return (
      <div className="travel-map-detail">
        <svg
          aria-label={`${title} 시·군·구 방문 지도`}
          className="korea-map district-map"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={viewBox}
        >
          {districts.map((district) => {
            const selectable = Boolean(
              district.sigunguCode && !focusedDistrict,
            );
            const key = district.sigunguCode
              ? `${depth.areaCode}:${district.sigunguCode}`
              : depth.areaCode;
            const visited = district.sigunguCode
              ? visitedSigunguKeys.has(key)
              : visitedAreaCodes.has(depth.areaCode);
            return (
              <path
                aria-label={`${district.name}, ${visited ? "방문" : "미방문"}${selectable ? ", 선택하면 확대" : ""}`}
                className={`map-region district-region${visited ? " visited" : ""}${focusedDistrict ? " selected" : ""}`}
                d={district.path}
                key={district.sigunguCode ?? district.name}
                onClick={
                  selectable
                    ? () =>
                        setDepth({
                          areaCode: depth.areaCode,
                          level: "sigungu",
                          sigunguCode: district.sigunguCode as string,
                        })
                    : undefined
                }
                role={selectable ? "button" : undefined}
                tabIndex={selectable ? 0 : undefined}
                onKeyDown={
                  selectable
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDepth({
                            areaCode: depth.areaCode,
                            level: "sigungu",
                            sigunguCode: district.sigunguCode as string,
                          });
                        }
                      }
                    : undefined
                }
              />
            );
          })}
          {districts.map((district) => (
            <text
              className="map-label district-label"
              fontSize={
                focusedDistrict
                  ? Math.max(28, districtMap.labelFontSize)
                  : districtMap.labelFontSize
              }
              key={`${district.sigunguCode ?? district.name}-label`}
              textAnchor="middle"
              x={district.labelX}
              y={district.labelY}
            >
              {district.name}
            </text>
          ))}
        </svg>
        <button className="map-depth-button" onClick={goBack} type="button">
          <span aria-hidden="true">←</span>
          {title}
        </button>
      </div>
    );
  }

  return (
    <div className="travel-map-detail">
      <svg
        aria-label="대한민국 17개 시·도 방문 지도"
        className="korea-map"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={southKoreaMap.viewBox}
      >
        {southKoreaMap.locations.map((location) => {
          const region = REGIONS[location.id as keyof typeof REGIONS];
          if (!region) return null;
          const visited = visitedAreaCodes.has(region.areaCode);
          return (
            <path
              aria-label={`${region.label}, ${visited ? "방문" : "미방문"}, 선택하면 시·군·구 지도 표시`}
              className={visited ? "map-region visited" : "map-region"}
              d={location.path}
              key={location.id}
              onClick={() => void openArea(region.areaCode)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void openArea(region.areaCode);
                }
              }}
              role="button"
              tabIndex={0}
            />
          );
        })}
        {Object.values(REGIONS).map((region) => (
          <text
            className="map-label"
            key={region.areaCode}
            textAnchor="middle"
            x={region.x}
            y={region.y}
          >
            {region.label}
          </text>
        ))}
      </svg>
      <p className="map-depth-label">대한민국</p>
    </div>
  );
}
