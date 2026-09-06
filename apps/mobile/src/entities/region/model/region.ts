export const KTO_AREA_CODES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
] as const;

export type KtoAreaCode = (typeof KTO_AREA_CODES)[number];

export type RegionId =
  | "busan"
  | "chungbuk"
  | "chungnam"
  | "daegu"
  | "daejeon"
  | "gangwon"
  | "gwangju"
  | "gyeongbuk"
  | "gyeonggi"
  | "gyeongnam"
  | "incheon"
  | "jeju"
  | "jeonbuk"
  | "jeonnam"
  | "sejong"
  | "seoul"
  | "ulsan";

export type Region = Readonly<{
  areaCode: KtoAreaCode;
  id: RegionId;
  name: string;
  shortName: string;
}>;

export type KtoSigunguKey = `${KtoAreaCode}:${string}`;

/**
 * 한국관광공사 TourAPI의 시·도 areaCode 목록이다.
 * id는 표시명 변경과 무관하게 앱 내부에서 유지하는 영문 식별자다.
 */
export const KTO_REGIONS = [
  { areaCode: "1", id: "seoul", name: "서울특별시", shortName: "서울" },
  { areaCode: "2", id: "incheon", name: "인천광역시", shortName: "인천" },
  { areaCode: "3", id: "daejeon", name: "대전광역시", shortName: "대전" },
  { areaCode: "4", id: "daegu", name: "대구광역시", shortName: "대구" },
  { areaCode: "5", id: "gwangju", name: "광주광역시", shortName: "광주" },
  { areaCode: "6", id: "busan", name: "부산광역시", shortName: "부산" },
  { areaCode: "7", id: "ulsan", name: "울산광역시", shortName: "울산" },
  {
    areaCode: "8",
    id: "sejong",
    name: "세종특별자치시",
    shortName: "세종",
  },
  { areaCode: "31", id: "gyeonggi", name: "경기도", shortName: "경기" },
  {
    areaCode: "32",
    id: "gangwon",
    name: "강원특별자치도",
    shortName: "강원",
  },
  {
    areaCode: "33",
    id: "chungbuk",
    name: "충청북도",
    shortName: "충북",
  },
  {
    areaCode: "34",
    id: "chungnam",
    name: "충청남도",
    shortName: "충남",
  },
  {
    areaCode: "35",
    id: "gyeongbuk",
    name: "경상북도",
    shortName: "경북",
  },
  {
    areaCode: "36",
    id: "gyeongnam",
    name: "경상남도",
    shortName: "경남",
  },
  {
    areaCode: "37",
    id: "jeonbuk",
    name: "전북특별자치도",
    shortName: "전북",
  },
  {
    areaCode: "38",
    id: "jeonnam",
    name: "전라남도",
    shortName: "전남",
  },
  {
    areaCode: "39",
    id: "jeju",
    name: "제주특별자치도",
    shortName: "제주",
  },
] as const satisfies readonly Region[];

export const TOTAL_KTO_REGION_COUNT = KTO_REGIONS.length;

/**
 * 여행 지도 디자인에서 사용하는 전국 시·군 기준 분모다.
 * 75개 시와 82개 군을 합한 값이며, 자치구와 제주 행정시는 제외한다.
 */
export const TOTAL_TRAVEL_CITY_COUNTY_COUNT = 157;

function createNumericCodeSet(
  lastCode: number,
  excludedCodes: readonly number[] = [],
): ReadonlySet<string> {
  const excluded = new Set(excludedCodes);
  return new Set(
    Array.from({ length: lastCode }, (_, index) => index + 1)
      .filter((code) => !excluded.has(code))
      .map(String),
  );
}

const PROVINCE_CITY_COUNTY_CODES: Readonly<
  Partial<Record<KtoAreaCode, ReadonlySet<string>>>
> = {
  "31": createNumericCodeSet(31),
  "32": createNumericCodeSet(18),
  // TourAPI에 남은 폐지 지역 청원군(9)은 제외한다.
  "33": createNumericCodeSet(12, [9]),
  "34": createNumericCodeSet(16, [10]),
  // 군위군(옛 5)은 대구광역시 코드 4:9로 편입됐다.
  "35": createNumericCodeSet(23, [5]),
  // TourAPI에 남은 폐지 지역 마산시(6), 진해시(14)와 미반환 코드(11)는 제외한다.
  "36": createNumericCodeSet(21, [6, 11, 14]),
  "37": createNumericCodeSet(14),
  "38": createNumericCodeSet(24, [14, 15]),
};

/**
 * 광역시 안에 남아 있는 군의 TourAPI areaCode:sigunguCode 조합이다.
 * 제주(39)의 제주시·서귀포시는 행정시이므로 전국 157개 시·군에는 넣지 않는다.
 */
const METROPOLITAN_COUNTY_KEYS: ReadonlySet<KtoSigunguKey> = new Set([
  "2:1", // 인천 강화군
  "2:9", // 인천 옹진군
  "4:3", // 대구 달성군
  "4:9", // 대구 군위군
  "6:3", // 부산 기장군
  "7:5", // 울산 울주군
]);

const areaCodeValues = new Set<string>(KTO_AREA_CODES);
const regionsByAreaCode = new Map<KtoAreaCode, Region>(
  KTO_REGIONS.map((region) => [region.areaCode, region]),
);

export function isKtoAreaCode(value: unknown): value is KtoAreaCode {
  return typeof value === "string" && areaCodeValues.has(value);
}

export function getRegionByAreaCode(
  areaCode: string | null | undefined,
): Region | undefined {
  return isKtoAreaCode(areaCode) ? regionsByAreaCode.get(areaCode) : undefined;
}

export function collectVisitedAreaCodes(
  areaCodes: Iterable<string | null | undefined>,
): ReadonlySet<KtoAreaCode> {
  const visitedAreaCodes = new Set<KtoAreaCode>();

  for (const areaCode of areaCodes) {
    if (isKtoAreaCode(areaCode)) {
      visitedAreaCodes.add(areaCode);
    }
  }

  return visitedAreaCodes;
}

export function createKtoSigunguKey(
  areaCode: string | null | undefined,
  sigunguCode: string | null | undefined,
): KtoSigunguKey | null {
  const normalizedSigunguCode = sigunguCode?.trim();

  if (!isKtoAreaCode(areaCode) || !normalizedSigunguCode) {
    return null;
  }

  return `${areaCode}:${normalizedSigunguCode}`;
}

export function collectVisitedSigunguKeys(
  regions: Iterable<
    Readonly<{
      areaCode: string | null | undefined;
      sigunguCode: string | null | undefined;
    }>
  >,
): ReadonlySet<KtoSigunguKey> {
  const keys = new Set<KtoSigunguKey>();

  for (const region of regions) {
    const key = createKtoSigunguKey(region.areaCode, region.sigunguCode);
    if (key) {
      keys.add(key);
    }
  }

  return keys;
}

export function isTravelCityCountyKey(
  areaCode: string | null | undefined,
  sigunguCode: string | null | undefined,
): boolean {
  const key = createKtoSigunguKey(areaCode, sigunguCode);
  if (!key || !isKtoAreaCode(areaCode)) {
    return false;
  }

  return (
    PROVINCE_CITY_COUNTY_CODES[areaCode]?.has(sigunguCode?.trim() ?? "") ===
      true || METROPOLITAN_COUNTY_KEYS.has(key)
  );
}

export function collectVisitedCityCountyKeys(
  regions: Iterable<
    Readonly<{
      areaCode: string | null | undefined;
      sigunguCode: string | null | undefined;
    }>
  >,
): ReadonlySet<KtoSigunguKey> {
  const keys = new Set<KtoSigunguKey>();

  for (const region of regions) {
    const key = createKtoSigunguKey(region.areaCode, region.sigunguCode);
    if (key && isTravelCityCountyKey(region.areaCode, region.sigunguCode)) {
      keys.add(key);
    }
  }

  return keys;
}

export type RegionVisitSummary = Readonly<{
  totalRegionCount: number;
  visitCountByAreaCode: Readonly<Record<KtoAreaCode, number>>;
  visitedAreaCodes: ReadonlySet<KtoAreaCode>;
  visitedRegionCount: number;
}>;

/** 중복 방문은 횟수로 세되, 방문 지역 수는 고유한 유효 areaCode만 센다. */
export function summarizeRegionVisits(
  areaCodes: Iterable<string | null | undefined>,
): RegionVisitSummary {
  const visitCountByAreaCode = Object.fromEntries(
    KTO_AREA_CODES.map((areaCode) => [areaCode, 0]),
  ) as Record<KtoAreaCode, number>;

  for (const areaCode of areaCodes) {
    if (isKtoAreaCode(areaCode)) {
      visitCountByAreaCode[areaCode] += 1;
    }
  }

  const visitedAreaCodes = collectVisitedAreaCodes(
    KTO_AREA_CODES.filter((areaCode) => visitCountByAreaCode[areaCode] > 0),
  );

  return {
    totalRegionCount: TOTAL_KTO_REGION_COUNT,
    visitCountByAreaCode,
    visitedAreaCodes,
    visitedRegionCount: visitedAreaCodes.size,
  };
}
