import { afterEach, describe, expect, it, vi } from "vitest";
import { BadGatewayException, GatewayTimeoutException } from "@nestjs/common";
import { KtoApiAdapter } from "@/tourism/adapters/kto-api.adapter";

const SERVICE_KEY = "kto-service-key";

const adapter = () => new KtoApiAdapter({ serviceKey: SERVICE_KEY });

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const listPayload = (items: readonly unknown[]) => ({
  response: {
    header: { resultCode: "0000", resultMsg: "OK" },
    body: { items: { item: items } },
  },
});

const place = (overrides: Record<string, unknown> = {}) => ({
  addr1: "서울 종로구 세종대로 175",
  areacode: "1",
  contentid: "126508",
  firstimage: "https://img.example/1.jpg",
  sigungucode: "23",
  title: "경복궁",
  ...overrides,
});

/**
 * Response 본문은 한 번만 읽을 수 있으므로 호출마다 clone 을 돌려준다.
 * 지역 검색은 법정동 코드 수만큼 병렬 호출할 수 있어 마지막 응답을 기본값으로 남겨둔다.
 */
const stubFetch = (...responses: readonly Response[]) => {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response.clone());
  }
  const fallback = responses.at(-1);
  fetchMock.mockImplementation(() =>
    Promise.resolve(
      fallback ? fallback.clone() : jsonResponse(listPayload([])),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const requestedUrl = (fetchMock: ReturnType<typeof vi.fn>, call = 0) =>
  new URL(String(fetchMock.mock.calls[call]?.[0]));

describe("KtoApiAdapter (docs/15 §4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("searchByKeyword", () => {
    it("searchKeyword2 를 호출하고 항목을 정규화한다", async () => {
      const fetchMock = stubFetch(jsonResponse(listPayload([place()])));

      const places = await adapter().searchByKeyword("경복궁", 5);

      expect(requestedUrl(fetchMock).pathname).toContain("searchKeyword2");
      expect(requestedUrl(fetchMock).searchParams.get("keyword")).toBe(
        "경복궁",
      );
      expect(places).toHaveLength(1);
      expect(places[0]).toMatchObject({
        contentId: "126508",
        title: "경복궁",
        areaCode: "1",
      });
    });

    it("빈 키워드는 상류를 호출하지 않고 빈 결과", async () => {
      const fetchMock = stubFetch();

      await expect(adapter().searchByKeyword("   ", 5)).resolves.toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("limit 을 상한(50)으로 자른다", async () => {
      const fetchMock = stubFetch(jsonResponse(listPayload([])));

      await adapter().searchByKeyword("서울", 9999);

      expect(requestedUrl(fetchMock).searchParams.get("numOfRows")).toBe("50");
    });

    it("contentId 나 title 이 없는 항목은 버린다", async () => {
      stubFetch(
        jsonResponse(
          listPayload([
            place(),
            { addr1: "주소만 있음" },
            place({ title: "" }),
          ]),
        ),
      );

      await expect(adapter().searchByKeyword("서울", 5)).resolves.toHaveLength(
        1,
      );
    });
  });

  describe("findByArea", () => {
    it("법정동 코드를 아는 지역은 lDongRegnCd 로 조회한다", async () => {
      const fetchMock = stubFetch(jsonResponse(listPayload([])));

      await adapter().findByArea({ areaCode: "1" }, 5);

      const params = requestedUrl(fetchMock).searchParams;
      expect(requestedUrl(fetchMock).pathname).toContain("areaBasedList2");
      expect(params.get("lDongRegnCd")).toBe("11");
      expect(params.has("areaCode")).toBe(false);
    });

    it("요청한 지역과 다른 항목은 걸러낸다", async () => {
      stubFetch(
        jsonResponse(
          listPayload([
            place({ areacode: "1", contentid: "1" }),
            place({ areacode: "2", contentid: "2" }),
          ]),
        ),
      );

      const places = await adapter().findByArea({ areaCode: "1" }, 5);

      expect(places.map((item) => item.contentId)).toEqual(["1"]);
    });

    /**
     * 수원시(31:13)는 일반구가 4개라 법정동 코드별로 4번 호출한다.
     * 같은 관광지가 여러 응답에 걸쳐 오면 한 번만 담아야 한다.
     */
    it("같은 contentId 가 여러 법정동 요청에서 오면 한 번만 담는다", async () => {
      // lDongRegnCd 41 + lDongSignguCd 115 는 구형 코드 31:13 으로 매핑된다
      const suwon = place({
        areacode: undefined,
        contentid: "dup",
        lDongRegnCd: "41",
        lDongSignguCd: "115",
        sigungucode: undefined,
      });
      stubFetch(
        jsonResponse(listPayload([suwon])),
        jsonResponse(listPayload([suwon])),
      );

      const places = await adapter().findByArea(
        { areaCode: "31", sigunguCode: "13" },
        5,
      );

      expect(places.filter((item) => item.contentId === "dup")).toHaveLength(1);
    });
  });

  describe("findDetail / findImages / listAreas", () => {
    it("detailCommon2 를 contentId 로 조회하고 상세 필드를 붙인다", async () => {
      const fetchMock = stubFetch(
        jsonResponse(
          listPayload([
            place({
              homepage: "https://x.example",
              overview: "소개",
              tel: "02",
            }),
          ]),
        ),
      );

      const detail = await adapter().findDetail("126508");

      expect(requestedUrl(fetchMock).pathname).toContain("detailCommon2");
      expect(requestedUrl(fetchMock).searchParams.get("contentId")).toBe(
        "126508",
      );
      expect(detail).toMatchObject({ overview: "소개", telephone: "02" });
    });

    it("상세 결과가 없으면 null", async () => {
      stubFetch(jsonResponse(listPayload([])));

      await expect(adapter().findDetail("126508")).resolves.toBeNull();
    });

    it("detailImage2 에서 원본 URL 이 없는 항목은 버린다", async () => {
      stubFetch(
        jsonResponse(
          listPayload([
            { contentid: "1", originimgurl: "https://img.example/a.jpg" },
            { contentid: "1" },
          ]),
        ),
      );

      await expect(adapter().findImages("1")).resolves.toHaveLength(1);
    });

    it("areaCode2 에서 코드·이름이 모두 있는 항목만 담는다", async () => {
      stubFetch(
        jsonResponse(listPayload([{ code: "1", name: "서울" }, { code: "2" }])),
      );

      await expect(adapter().listAreas()).resolves.toEqual([
        { code: "1", name: "서울" },
      ]);
    });
  });

  describe("실패 매핑", () => {
    it("KorService2 평면 오류 응답은 502", async () => {
      stubFetch(
        jsonResponse({ resultCode: "9999", resultMsg: "SERVICE ERROR" }),
      );

      await expect(adapter().searchByKeyword("서울", 5)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it("중첩된 response.header 오류도 502", async () => {
      stubFetch(
        jsonResponse({
          response: { header: { resultCode: "0001", resultMsg: "NO DATA" } },
        }),
      );

      await expect(adapter().searchByKeyword("서울", 5)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it("OpenAPI 게이트웨이 오류는 HTTP 상태보다 우선해 502", async () => {
      stubFetch(
        jsonResponse(
          {
            OpenAPI_ServiceResponse: {
              cmmMsgHeader: {
                returnReasonCode: "22",
                returnAuthMsg: "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS",
              },
            },
          },
          200,
        ),
      );

      await expect(adapter().searchByKeyword("서울", 5)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it("비-JSON 오류 응답은 502", async () => {
      stubFetch(new Response("<html>", { status: 500 }));

      await expect(adapter().searchByKeyword("서울", 5)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it("네트워크 실패는 502", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));

      await expect(adapter().searchByKeyword("서울", 5)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it("타임아웃은 504", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((_url: unknown, init: unknown) => {
          const signal =
            init && typeof init === "object" && "signal" in init
              ? init.signal
              : undefined;
          return new Promise((_resolve, reject) => {
            if (signal instanceof AbortSignal) {
              signal.addEventListener("abort", () =>
                reject(new DOMException("aborted", "AbortError")),
              );
            }
          });
        }),
      );

      await expect(
        new KtoApiAdapter({ serviceKey: SERVICE_KEY }, 10).searchByKeyword(
          "서울",
          5,
        ),
      ).rejects.toBeInstanceOf(GatewayTimeoutException);
    });

    /** 상류 메시지에는 쿼리스트링이 통째로 섞여 올 수 있다 */
    it("어떤 실패에서도 서비스키가 에러 메시지에 새지 않는다", async () => {
      const failures: Array<() => void> = [
        () =>
          stubFetch(
            jsonResponse({
              resultCode: "9999",
              resultMsg: `bad request serviceKey=${SERVICE_KEY}`,
            }),
          ),
        () =>
          vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error(`connect ${SERVICE_KEY}`)),
          ),
        () => stubFetch(new Response(SERVICE_KEY, { status: 500 })),
      ];

      for (const setUp of failures) {
        vi.unstubAllGlobals();
        setUp();
        const error = await adapter()
          .searchByKeyword("서울", 5)
          .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(Error);
        expect(String(error)).not.toContain(SERVICE_KEY);
      }
    });
  });

  it("서비스키를 쿼리에 싣되 로그로 새지 않도록 URL 만 쓴다", async () => {
    const fetchMock = stubFetch(jsonResponse(listPayload([])));

    await adapter().listAreas();

    expect(requestedUrl(fetchMock).searchParams.get("serviceKey")).toBe(
      SERVICE_KEY,
    );
    expect(requestedUrl(fetchMock).searchParams.get("_type")).toBe("json");
  });
});
