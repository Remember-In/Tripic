import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchKtoPlaceDetail,
  fetchKtoPlaceImages,
  fetchKtoPlacesByArea,
  fetchNearbyKtoPlaces,
  KtoApiError,
  searchKtoPlaces,
} from "./client";

const previousServiceKey = process.env.EXPO_PUBLIC_KTO_SERVICE_KEY;

function successfulListPayload(count: number) {
  return {
    response: {
      body: {
        items: {
          item: Array.from({ length: count }, (_, index) => ({
            addr1: `서울 주소 ${index + 1}`,
            areacode: "1",
            contentid: String(index + 1),
            title: `서울 관광지 ${index + 1}`,
          })),
        },
      },
      header: { resultCode: "0000", resultMsg: "OK" },
    },
  };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_KTO_SERVICE_KEY = "test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (previousServiceKey === undefined) {
    delete process.env.EXPO_PUBLIC_KTO_SERVICE_KEY;
  } else {
    process.env.EXPO_PUBLIC_KTO_SERVICE_KEY = previousServiceKey;
  }
});

describe("fetchKtoPlacesByArea", () => {
  it("calls areaBasedList2 with the configured candidate limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(successfulListPayload(6)), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const places = await fetchKtoPlacesByArea(
      { areaCode: "1" },
      { maxCandidates: 3 },
    );

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    const url = new URL(requestUrl);
    expect(url.pathname).toBe("/B551011/KorService2/areaBasedList2");
    expect(url.searchParams.get("areaCode")).toBe("1");
    expect(url.searchParams.get("numOfRows")).toBe("3");
    expect(places).toHaveLength(3);
  });

  it("omits areaCode when browsing all regions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(successfulListPayload(1)), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await fetchKtoPlacesByArea();

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(new URL(requestUrl).searchParams.has("areaCode")).toBe(false);
  });

  it("does not start a request when the caller already canceled it", async () => {
    const fetchMock = vi.fn();
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchKtoPlacesByArea({}, { signal: controller.signal }),
    ).rejects.toMatchObject({ code: "ABORTED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("configured KTO candidate limits", () => {
  it.each([
    {
      invoke: () =>
        fetchNearbyKtoPlaces(
          { latitude: 37.5, longitude: 127, radiusMeters: 300 },
          { maxCandidates: 4 },
        ),
      pathname: "/B551011/KorService2/locationBasedList2",
    },
    {
      invoke: () => searchKtoPlaces("경복궁", { maxCandidates: 4 }),
      pathname: "/B551011/KorService2/searchKeyword2",
    },
  ])("uses maxCandidates for $pathname", async ({ invoke, pathname }) => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(successfulListPayload(6)), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const places = await invoke();

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    const url = new URL(requestUrl);
    expect(url.pathname).toBe(pathname);
    expect(url.searchParams.get("numOfRows")).toBe("4");
    expect(places).toHaveLength(4);
  });

  it("caps an excessive server value before sending it to TourAPI", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(successfulListPayload(60)), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const places = await searchKtoPlaces("경복궁", { maxCandidates: 1_000 });

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(new URL(requestUrl).searchParams.get("numOfRows")).toBe("50");
    expect(places).toHaveLength(50);
  });
});

describe("nearby KTO radius limits", () => {
  it.each([
    { expectedRadius: "1", radiusMeters: 0 },
    { expectedRadius: "123", radiusMeters: 123.9 },
    { expectedRadius: "20000", radiusMeters: 50_000 },
  ])(
    "normalizes $radiusMeters meters to $expectedRadius meters",
    async ({ expectedRadius, radiusMeters }) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(successfulListPayload(1)), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      await fetchNearbyKtoPlaces({
        latitude: 37.5,
        longitude: 127,
        radiusMeters,
      });

      const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
      expect(new URL(requestUrl).searchParams.get("radius")).toBe(
        expectedRadius,
      );
    },
  );
});

describe("KorService2 detail request parameters", () => {
  it("requests detailCommon2 with only contentId and common parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: {
            body: {
              items: {
                item: {
                  contentid: "126508",
                  title: "경복궁",
                },
              },
            },
            header: { resultCode: "0000", resultMsg: "OK" },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchKtoPlaceDetail("126508");

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    const url = new URL(requestUrl);
    expect(url.pathname).toBe("/B551011/KorService2/detailCommon2");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      MobileApp: "Tripic",
      MobileOS: "ETC",
      _type: "json",
      contentId: "126508",
      serviceKey: "test-key",
    });
  });

  it("requests detailImage2 without the removed subImageYN parameter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(successfulListPayload(0)), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await fetchKtoPlaceImages("126508");

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    const url = new URL(requestUrl);
    expect(url.pathname).toBe("/B551011/KorService2/detailImage2");
    expect(url.searchParams.get("contentId")).toBe("126508");
    expect(url.searchParams.get("imageYN")).toBe("Y");
    expect(url.searchParams.get("numOfRows")).toBe("10");
    expect(url.searchParams.get("pageNo")).toBe("1");
    expect(url.searchParams.has("subImageYN")).toBe(false);
  });
});

describe("KTO API errors", () => {
  it("throws KtoApiError for a flat KorService2 error response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          responseTime: "2026-09-05T12:34:56",
          resultCode: "05",
          resultMsg: "INVALID REQUEST PARAMETER ERROR",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchKtoPlaces("경복궁")).rejects.toEqual(
      expect.objectContaining<KtoApiError>({
        code: "05",
        message: "INVALID REQUEST PARAMETER ERROR",
        name: "KtoApiError",
      }),
    );
  });

  it("keeps handling nested TourAPI response header errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: {
            body: {},
            header: { resultCode: "30", resultMsg: "SERVICE KEY ERROR" },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchKtoPlaces("경복궁")).rejects.toMatchObject({
      code: "30",
      message: "SERVICE KEY ERROR",
      name: "KtoApiError",
    });
  });

  it("prioritizes the OpenAPI gateway JSON error over its HTTP status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          OpenAPI_ServiceResponse: {
            cmmMsgHeader: {
              errMsg: "SERVICE ERROR",
              returnAuthMsg: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
              returnReasonCode: "30",
            },
          },
        }),
        { status: 403 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchKtoPlaces("경복궁")).rejects.toMatchObject({
      code: "30",
      message: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
      name: "KtoApiError",
    });
  });

  it("falls back to the HTTP status for a non-JSON error response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("Forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchKtoPlaces("경복궁")).rejects.toMatchObject({
      code: "HTTP_403",
      name: "KtoApiError",
    });
  });

  it("reports a malformed successful response separately", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("not-json", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchKtoPlaces("경복궁")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      name: "KtoApiError",
    });
  });
});
