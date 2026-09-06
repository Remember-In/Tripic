import generatedRegionCodeMap from "./regionCodeMap.generated.json";

type LegacyRegionCode = Readonly<{
  areaCode: string;
  sigunguCode: string | null;
}>;

type GeneratedRegionCodeMap = Readonly<{
  administrativeCodeToLegacy: Readonly<Record<string, LegacyRegionCode>>;
  legalAreaCodeToLegacy: Readonly<Record<string, string>>;
  legacyAreaCodeToLegal: Readonly<Record<string, string>>;
}>;

type RawKtoRegionCodes = Readonly<{
  areaCode?: string;
  legalAreaCode?: string;
  legalSigunguCode?: string;
  sigunguCode?: string;
}>;

export type ResolvedKtoRegionCodes = Readonly<{
  areaCode: string;
  legalAreaCode?: string;
  legalSigunguCode?: string;
  sigunguCode?: string;
}>;

const codeMap = generatedRegionCodeMap as unknown as GeneratedRegionCodeMap;

const legacyAreaCodeToLegal = new Map<string, string>(
  Object.entries(codeMap.legacyAreaCodeToLegal),
);

const legalDistrictCodesByLegacyKey = new Map<string, string[]>();

Object.entries(codeMap.administrativeCodeToLegacy).forEach(
  ([administrativeCode, legacyCodes]) => {
    if (!legacyCodes.sigunguCode) {
      return;
    }

    const key = `${legacyCodes.areaCode}:${legacyCodes.sigunguCode}`;
    const codes = legalDistrictCodesByLegacyKey.get(key) ?? [];
    codes.push(administrativeCode.slice(2));
    legalDistrictCodesByLegacyKey.set(key, codes);
  },
);

function normalized(value: string | undefined) {
  return value?.trim() || undefined;
}

function administrativeCode(
  legalAreaCode: string | undefined,
  legalSigunguCode: string | undefined,
) {
  if (!legalAreaCode || !legalSigunguCode) {
    return undefined;
  }

  if (
    legalSigunguCode.length === 5 &&
    legalSigunguCode.startsWith(legalAreaCode)
  ) {
    return legalSigunguCode;
  }

  return `${legalAreaCode}${legalSigunguCode.padStart(3, "0")}`;
}

/**
 * KorService2의 신형 법정동 코드 응답을 앱이 저장해 온 구형 TourAPI 코드로
 * 정규화한다. 두 체계가 함께 오면 경계 데이터와 직접 연결되는 신형 코드를
 * 우선하고, 아직 매핑되지 않은 개편 지역은 구형 필드로 안전하게 폴백한다.
 */
export function resolveKtoRegionCodes(
  input: RawKtoRegionCodes,
): ResolvedKtoRegionCodes {
  const legacyAreaCode = normalized(input.areaCode);
  const legacySigunguCode = normalized(input.sigunguCode);
  const legalAreaCode = normalized(input.legalAreaCode);
  const legalSigunguCode = normalized(input.legalSigunguCode);
  const fullAdministrativeCode = administrativeCode(
    legalAreaCode,
    legalSigunguCode,
  );
  const mappedDistrict = fullAdministrativeCode
    ? codeMap.administrativeCodeToLegacy[fullAdministrativeCode]
    : undefined;

  return {
    areaCode:
      mappedDistrict?.areaCode ??
      legacyAreaCode ??
      (legalAreaCode
        ? (codeMap.legalAreaCodeToLegacy[legalAreaCode] ?? "")
        : ""),
    legalAreaCode,
    legalSigunguCode,
    sigunguCode:
      mappedDistrict !== undefined
        ? (mappedDistrict.sigunguCode ?? undefined)
        : legacySigunguCode,
  };
}

export function getLegalAreaCode(legacyAreaCode: string | undefined) {
  const value = normalized(legacyAreaCode);
  return value ? legacyAreaCodeToLegal.get(value) : undefined;
}

export function getLegalDistrictCodes(
  legacyAreaCode: string | undefined,
  legacySigunguCode: string | undefined,
): readonly string[] {
  const areaCode = normalized(legacyAreaCode);
  const sigunguCode = normalized(legacySigunguCode);
  if (!areaCode || !sigunguCode) {
    return [];
  }

  return legalDistrictCodesByLegacyKey.get(`${areaCode}:${sigunguCode}`) ?? [];
}
