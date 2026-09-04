import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchKtoPlacesByArea } from "./client";

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
  it("calls areaBasedList2 with a region and limits the response to five", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(successfulListPayload(6)), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const places = await fetchKtoPlacesByArea({ areaCode: "1" });

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    const url = new URL(requestUrl);
    expect(url.pathname).toBe("/B551011/KorService2/areaBasedList2");
    expect(url.searchParams.get("areaCode")).toBe("1");
    expect(url.searchParams.get("numOfRows")).toBe("5");
    expect(places).toHaveLength(5);
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
