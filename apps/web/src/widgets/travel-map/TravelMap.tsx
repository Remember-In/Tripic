import southKoreaMapData from "@svg-maps/south-korea";

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
  jeju: { areaCode: "39", label: "제주", x: 197, y: 574 },
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

type TravelMapProps = {
  visitedAreaCodes?: ReadonlySet<string>;
};

export function TravelMap({ visitedAreaCodes = new Set() }: TravelMapProps) {
  return (
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
            aria-label={`${region.label}, ${visited ? "방문" : "미방문"}`}
            className={visited ? "map-region visited" : "map-region"}
            d={location.path}
            key={location.id}
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
  );
}
