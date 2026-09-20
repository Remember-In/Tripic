import { BadGatewayException, GatewayTimeoutException } from "@nestjs/common";
import {
  MAX_TOURISM_LIST_LIMIT,
  type KtoArea,
  type KtoImage,
  type KtoListItem,
  type KtoPlaceDetail,
} from "@tripic/shared";
import type { KtoAreaFilter, KtoClient } from "@/tourism/ports/kto-client.port";
import {
  getLegalAreaCode,
  getLegalDistrictCodes,
  resolveKtoRegionCodes,
} from "@/tourism/region-code-map";
import type { TourismConfig } from "@/config/tourism-config";

const KTO_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const DEFAULT_TIMEOUT_MS = 10_000;

type UnknownRecord = Readonly<Record<string, unknown>>;

/** 상류가 돌려준 실패 — 메시지는 진단용이며 응답 본문으로 내보내지 않는다 */
class KtoUpstreamError extends Error {
  constructor(readonly code: string) {
    super(`kto upstream error: ${code}`);
    this.name = "KtoUpstreamError";
  }
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): UnknownRecord =>
  isRecord(value) ? value : {};

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const optionalString = (value: unknown) => asString(value) || undefined;

/** 클라이언트가 보낸 값이 무엇이든 1..50 으로 좁힌다 */
const listLimit = (value: number): number => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    return 1;
  }
  return Math.min(value, MAX_TOURISM_LIST_LIMIT);
};

function parseListItem(value: unknown): KtoListItem | null {
  const item = asRecord(value);
  const contentId = asString(item.contentid);
  const title = asString(item.title);
  if (!contentId || !title) {
    return null;
  }

  const regionCodes = resolveKtoRegionCodes({
    areaCode: optionalString(item.areacode),
    legalAreaCode:
      optionalString(item.lDongRegnCd) ?? optionalString(item.ldongregncd),
    legalSigunguCode:
      optionalString(item.lDongSignguCd) ?? optionalString(item.ldongsigngucd),
    sigunguCode: optionalString(item.sigungucode),
  });

  return {
    address: [asString(item.addr1), asString(item.addr2)]
      .filter(Boolean)
      .join(" "),
    areaCode: regionCodes.areaCode,
    categoryCode:
      optionalString(item.cat3) ??
      optionalString(item.cat2) ??
      optionalString(item.cat1),
    contentId,
    contentTypeId: optionalString(item.contenttypeid),
    imageUrl: optionalString(item.firstimage),
    legalAreaCode: regionCodes.legalAreaCode,
    legalSigunguCode: regionCodes.legalSigunguCode,
    sigunguCode: regionCodes.sigunguCode,
    thumbnailUrl: optionalString(item.firstimage2),
    title,
  };
}

/** 지역 검색은 신형 법정동 코드를 우선하고, 매핑이 없으면 구형 코드로 폴백한다 */
function areaSearchFilters(
  filter: KtoAreaFilter,
): readonly Readonly<Record<string, string | undefined>>[] {
  const areaCode = filter.areaCode.trim();
  const sigunguCode = filter.sigunguCode?.trim();
  if (!areaCode) {
    return [{}];
  }

  const legalAreaCode = getLegalAreaCode(areaCode);
  if (!legalAreaCode) {
    return [{ areaCode, sigunguCode }];
  }
  if (!sigunguCode) {
    return [{ lDongRegnCd: legalAreaCode }];
  }

  const legalDistrictCodes = getLegalDistrictCodes(areaCode, sigunguCode);
  if (legalDistrictCodes.length === 0) {
    return [{ areaCode, sigunguCode }];
  }

  return legalDistrictCodes.map((legalSigunguCode) => ({
    lDongRegnCd: legalAreaCode,
    lDongSignguCd: legalSigunguCode,
  }));
}

function extractItems(payload: unknown): readonly unknown[] {
  const root = asRecord(payload);

  const flatResultCode = asString(root.resultCode);
  if (flatResultCode && flatResultCode !== "0000") {
    throw new KtoUpstreamError(flatResultCode);
  }

  const commonErrorHeader = asRecord(
    asRecord(root.OpenAPI_ServiceResponse).cmmMsgHeader,
  );
  const gatewayResultCode = asString(commonErrorHeader.returnReasonCode);
  const gatewayMessagePresent =
    Boolean(asString(commonErrorHeader.returnAuthMsg)) ||
    Boolean(asString(commonErrorHeader.errMsg));
  if (gatewayResultCode || gatewayMessagePresent) {
    throw new KtoUpstreamError(gatewayResultCode || "OPEN_API_SERVICE_ERROR");
  }

  const response = asRecord(root.response);
  const resultCode = asString(asRecord(response.header).resultCode);
  if (resultCode && resultCode !== "0000") {
    throw new KtoUpstreamError(resultCode);
  }

  const items = asRecord(response.body).items;
  if (!items || typeof items === "string") {
    return [];
  }

  const item = asRecord(items).item;
  if (!item) {
    return [];
  }
  return Array.isArray(item) ? item : [item];
}

/**
 * TourAPI(KorService2) outbound adapter (docs/15 §4).
 *
 * 모바일 `apps/mobile/src/shared/api/kto/client.ts` 의 서버 이식본이며 의도적으로 분기한다:
 * 좌표 기반 주변검색 없음, env 주입, Nest 예외 매핑, 사용자 문구 대신 진단용 코드.
 * 응답은 어디에도 저장하지 않는다.
 */
export class KtoApiAdapter implements KtoClient {
  constructor(
    private readonly tourism: TourismConfig,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  async searchByKeyword(
    keyword: string,
    limit: number,
  ): Promise<readonly KtoListItem[]> {
    const normalized = keyword.trim();
    if (!normalized) {
      return [];
    }

    const rows = listLimit(limit);
    const items = await this.request("searchKeyword2", {
      arrange: "A",
      keyword: normalized,
      numOfRows: rows,
      pageNo: 1,
    });

    return this.toPlaces(items).slice(0, rows);
  }

  async findByArea(
    filter: KtoAreaFilter,
    limit: number,
  ): Promise<readonly KtoListItem[]> {
    const rows = listLimit(limit);
    const requestedAreaCode = filter.areaCode.trim();
    const requestedSigunguCode = filter.sigunguCode?.trim();
    // 광주·전남처럼 법정동 코드를 공유하는 지역은 넓게 받아 와서 걸러내야 한다
    const isSharedLegalArea =
      !requestedSigunguCode &&
      (requestedAreaCode === "5" || requestedAreaCode === "38");

    const itemGroups = await Promise.all(
      areaSearchFilters(filter).map((regionFilter) =>
        this.request("areaBasedList2", {
          ...regionFilter,
          arrange: "A",
          numOfRows: isSharedLegalArea ? MAX_TOURISM_LIST_LIMIT : rows,
          pageNo: 1,
        }),
      ),
    );

    const seen = new Set<string>();
    return this.toPlaces(itemGroups.flat())
      .filter(
        (item) => !requestedAreaCode || item.areaCode === requestedAreaCode,
      )
      .filter(
        (item) =>
          !requestedSigunguCode || item.sigunguCode === requestedSigunguCode,
      )
      .filter((item) => {
        if (seen.has(item.contentId)) {
          return false;
        }
        seen.add(item.contentId);
        return true;
      })
      .sort((left, right) => left.title.localeCompare(right.title, "ko"))
      .slice(0, rows);
  }

  async findDetail(contentId: string): Promise<KtoPlaceDetail | null> {
    const [rawItem] = await this.request("detailCommon2", { contentId });
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

  async findImages(contentId: string): Promise<readonly KtoImage[]> {
    const items = await this.request("detailImage2", {
      contentId,
      imageYN: "Y",
      numOfRows: 10,
      pageNo: 1,
    });

    return items.flatMap<KtoImage>((value) => {
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

  async listAreas(): Promise<readonly KtoArea[]> {
    const items = await this.request("areaCode2", { numOfRows: 50, pageNo: 1 });

    return items.flatMap<KtoArea>((value) => {
      const item = asRecord(value);
      const code = asString(item.code);
      const name = asString(item.name);
      return code && name ? [{ code, name }] : [];
    });
  }

  private toPlaces(items: readonly unknown[]): KtoListItem[] {
    return items
      .map(parseListItem)
      .filter((item): item is KtoListItem => item !== null);
  }

  private async request(
    endpoint: string,
    params: Readonly<Record<string, number | string | undefined>>,
  ): Promise<readonly unknown[]> {
    const query = new URLSearchParams({
      MobileApp: "Tripic",
      MobileOS: "ETC",
      _type: "json",
      serviceKey: this.tourism.serviceKey,
    });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        query.set(key, String(value));
      }
    }

    let response: Response;
    try {
      response = await fetch(`${KTO_BASE_URL}/${endpoint}?${query}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      // 원본 메시지에는 URL(=서비스키)이 섞일 수 있어 그대로 감싸지 않는다
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new GatewayTimeoutException("tourism upstream timed out");
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new GatewayTimeoutException("tourism upstream timed out");
      }
      throw new BadGatewayException("tourism upstream unreachable");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException(
        response.ok
          ? "tourism upstream returned a non-json response"
          : `tourism upstream error: status ${response.status}`,
      );
    }

    try {
      const items = extractItems(payload);
      if (!response.ok) {
        throw new BadGatewayException(
          `tourism upstream error: status ${response.status}`,
        );
      }
      return items;
    } catch (error) {
      if (error instanceof KtoUpstreamError) {
        // 짧은 코드만 남긴다 — resultMsg·본문은 요청 파라미터를 되울릴 수 있다
        throw new BadGatewayException(error.message);
      }
      throw error;
    }
  }
}
