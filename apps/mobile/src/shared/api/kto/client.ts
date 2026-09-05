import type {
  KtoArea,
  KtoAreaSearchInput,
  KtoImage,
  KtoListRequestOptions,
  KtoListItem,
  KtoPlaceDetail,
  KtoRequestOptions,
} from "./types";
import { MAX_KTO_LIST_CANDIDATES, MAX_KTO_RADIUS_METERS } from "./types";

const KTO_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const DEFAULT_TIMEOUT_MS = 10_000;

type UnknownRecord = Readonly<Record<string, unknown>>;

export class KtoApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "KtoApiError";
    this.code = code;
  }
}

export class KtoConfigurationError extends KtoApiError {
  constructor() {
    super(
      "MISSING_SERVICE_KEY",
      "한국관광공사 TourAPI 키가 설정되지 않았습니다.",
    );
    this.name = "KtoConfigurationError";
  }
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const parsed = asString(value);
  return parsed || undefined;
}

function optionalNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function candidateLimit(value: number | undefined) {
  const positiveValue =
    Number.isSafeInteger(value) && (value as number) > 0
      ? (value as number)
      : 5;
  return Math.min(positiveValue, MAX_KTO_LIST_CANDIDATES);
}

function nearbyRadiusMeters(value: number) {
  const integerValue = Number.isFinite(value) ? Math.trunc(value) : 1;
  return Math.min(Math.max(integerValue, 1), MAX_KTO_RADIUS_METERS);
}

function parseListItem(value: unknown): KtoListItem | null {
  const item = asRecord(value);
  const contentId = asString(item.contentid);
  const title = asString(item.title);
  if (!contentId || !title) {
    return null;
  }

  return {
    address: [asString(item.addr1), asString(item.addr2)]
      .filter(Boolean)
      .join(" "),
    areaCode: asString(item.areacode),
    categoryCode:
      optionalString(item.cat3) ??
      optionalString(item.cat2) ??
      optionalString(item.cat1),
    contentId,
    contentTypeId: optionalString(item.contenttypeid),
    distanceMeters: optionalNumber(item.dist),
    imageUrl: optionalString(item.firstimage),
    sigunguCode: optionalString(item.sigungucode),
    thumbnailUrl: optionalString(item.firstimage2),
    title,
  };
}

function extractItems(payload: unknown): readonly unknown[] {
  const response = asRecord(asRecord(payload).response);
  const header = asRecord(response.header);
  const resultCode = asString(header.resultCode);
  if (resultCode && resultCode !== "0000") {
    throw new KtoApiError(
      resultCode,
      asString(header.resultMsg) || "TourAPI 요청에 실패했습니다.",
    );
  }

  const body = asRecord(response.body);
  const items = body.items;
  if (!items || typeof items === "string") {
    return [];
  }

  const item = asRecord(items).item;
  if (!item) {
    return [];
  }

  return Array.isArray(item) ? item : [item];
}

function configuredServiceKey() {
  const key = process.env.EXPO_PUBLIC_KTO_SERVICE_KEY?.trim();
  if (!key) {
    throw new KtoConfigurationError();
  }
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

async function requestKto(
  endpoint: string,
  params: Readonly<Record<string, number | string | undefined>>,
  options: KtoRequestOptions = {},
) {
  if (options.signal?.aborted) {
    throw new KtoApiError("ABORTED", "관광지 검색을 취소했습니다.");
  }

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const query = new URLSearchParams({
      MobileApp: "Tripic",
      MobileOS: "ETC",
      _type: "json",
      serviceKey: configuredServiceKey(),
    });
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        query.set(key, String(value));
      }
    });

    const response = await fetch(`${KTO_BASE_URL}/${endpoint}?${query}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new KtoApiError(
        `HTTP_${response.status}`,
        "관광정보 서버에 연결하지 못했습니다.",
      );
    }

    return extractItems(await response.json());
  } catch (error) {
    if (error instanceof KtoApiError) {
      throw error;
    }
    if (controller.signal.aborted) {
      throw new KtoApiError(
        options.signal?.aborted ? "ABORTED" : "TIMEOUT",
        options.signal?.aborted
          ? "관광지 검색을 취소했습니다."
          : "관광지 검색 시간이 초과되었습니다.",
      );
    }
    throw new KtoApiError(
      "NETWORK_ERROR",
      "네트워크를 확인하고 다시 시도해 주세요.",
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}

export async function fetchNearbyKtoPlaces(
  input: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  },
  options?: KtoListRequestOptions,
) {
  const maxCandidates = candidateLimit(options?.maxCandidates);
  const items = await requestKto(
    "locationBasedList2",
    {
      arrange: "E",
      mapX: input.longitude,
      mapY: input.latitude,
      numOfRows: maxCandidates,
      pageNo: 1,
      radius: nearbyRadiusMeters(input.radiusMeters),
    },
    options,
  );

  return items
    .map(parseListItem)
    .filter((item): item is KtoListItem => Boolean(item))
    .sort(
      (left, right) =>
        (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
        (right.distanceMeters ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, maxCandidates);
}

export async function searchKtoPlaces(
  keyword: string,
  options?: KtoListRequestOptions,
) {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) {
    return [];
  }

  const maxCandidates = candidateLimit(options?.maxCandidates);
  const items = await requestKto(
    "searchKeyword2",
    {
      arrange: "A",
      keyword: normalizedKeyword,
      numOfRows: maxCandidates,
      pageNo: 1,
    },
    options,
  );

  return items
    .map(parseListItem)
    .filter((item): item is KtoListItem => Boolean(item))
    .slice(0, maxCandidates);
}

export async function fetchKtoPlacesByArea(
  input: KtoAreaSearchInput = {},
  options?: KtoListRequestOptions,
) {
  const maxCandidates = candidateLimit(options?.maxCandidates);
  const items = await requestKto(
    "areaBasedList2",
    {
      areaCode: input.areaCode?.trim(),
      arrange: "A",
      numOfRows: maxCandidates,
      pageNo: 1,
      sigunguCode: input.sigunguCode?.trim(),
    },
    options,
  );

  return items
    .map(parseListItem)
    .filter((item): item is KtoListItem => Boolean(item))
    .slice(0, maxCandidates);
}

export async function fetchKtoPlaceDetail(
  contentId: string,
  options?: KtoRequestOptions,
): Promise<KtoPlaceDetail | null> {
  const [rawItem] = await requestKto(
    "detailCommon2",
    {
      addrinfoYN: "Y",
      areacodeYN: "Y",
      catcodeYN: "Y",
      contentId,
      defaultYN: "Y",
      firstImageYN: "Y",
      mapinfoYN: "N",
      overviewYN: "Y",
    },
    options,
  );
  const base = parseListItem(rawItem);
  if (!base) {
    return null;
  }
  const item = asRecord(rawItem);
  return {
    ...base,
    homepage: optionalString(item.homepage),
    overview: optionalString(item.overview),
    telephone: optionalString(item.tel),
  };
}

export async function fetchKtoPlaceImages(
  contentId: string,
  options?: KtoRequestOptions,
): Promise<readonly KtoImage[]> {
  const items = await requestKto(
    "detailImage2",
    {
      contentId,
      imageYN: "Y",
      numOfRows: 10,
      pageNo: 1,
      subImageYN: "Y",
    },
    options,
  );

  return items.flatMap((value) => {
    const item = asRecord(value);
    const originalUrl = asString(item.originimgurl);
    if (!originalUrl) {
      return [];
    }
    return [
      {
        contentId: asString(item.contentid) || contentId,
        originalUrl,
        thumbnailUrl: optionalString(item.smallimageurl),
      },
    ];
  });
}

export async function fetchKtoAreas(options?: KtoRequestOptions) {
  const items = await requestKto(
    "areaCode2",
    { numOfRows: 50, pageNo: 1 },
    options,
  );

  return items.flatMap<KtoArea>((value) => {
    const item = asRecord(value);
    const code = asString(item.code);
    const name = asString(item.name);
    return code && name ? [{ code, name }] : [];
  });
}
