import { describe, expect, it } from "vitest";
import {
  contentIdSchema,
  tourismPlacesQuerySchema,
  tourismSearchQuerySchema,
} from "@/tourism/tourism.contract";

/**
 * `/tourism` 요청 계약의 경계값을 고정한다.
 * 라우트가 이 스키마를 그대로 쓰므로 여기서 통과/거부가 곧 400 여부가 된다 (docs/15 §4).
 */
describe("tourismSearchQuerySchema — 키워드 검색", () => {
  it("키워드를 통과시킨다", () => {
    expect(tourismSearchQuerySchema.parse({ keyword: "강원도" })).toMatchObject(
      { keyword: "강원도" },
    );
  });

  it("앞뒤 공백을 다듬는다", () => {
    expect(
      tourismSearchQuerySchema.parse({ keyword: "  경복궁  " }).keyword,
    ).toBe("경복궁");
  });

  it("키워드가 없거나 공백뿐이면 거부한다", () => {
    expect(tourismSearchQuerySchema.safeParse({}).success).toBe(false);
    expect(tourismSearchQuerySchema.safeParse({ keyword: "" }).success).toBe(
      false,
    );
    expect(tourismSearchQuerySchema.safeParse({ keyword: "   " }).success).toBe(
      false,
    );
  });

  it("limit 기본값은 5 이고 문자열 쿼리도 숫자로 받는다", () => {
    expect(tourismSearchQuerySchema.parse({ keyword: "서울" }).limit).toBe(5);
    expect(
      tourismSearchQuerySchema.parse({ keyword: "서울", limit: "20" }).limit,
    ).toBe(20);
  });

  it("limit 상한은 50, 하한은 1", () => {
    expect(
      tourismSearchQuerySchema.safeParse({ keyword: "서울", limit: "51" })
        .success,
    ).toBe(false);
    expect(
      tourismSearchQuerySchema.safeParse({ keyword: "서울", limit: "0" })
        .success,
    ).toBe(false);
  });

  /** 좌표는 받지 않는다 — 서버에 닿는 순간 위치정보법 판단이 달라진다 (docs/12 §3-②-1) */
  it("좌표 파라미터는 통과시키지 않는다", () => {
    const parsed = tourismSearchQuerySchema.parse({
      keyword: "서울",
      mapX: "127.0",
      mapY: "37.5",
    });

    expect(parsed).not.toHaveProperty("mapX");
    expect(parsed).not.toHaveProperty("mapY");
  });
});

describe("tourismPlacesQuerySchema — 지역 검색", () => {
  it("지역 코드를 통과시킨다", () => {
    expect(
      tourismPlacesQuerySchema.parse({ areaCode: "1", sigunguCode: "23" }),
    ).toMatchObject({ areaCode: "1", sigunguCode: "23" });
  });

  it("시군구 없이 시·도만으로도 통과한다", () => {
    expect(
      tourismPlacesQuerySchema.parse({ areaCode: "1" }).sigunguCode,
    ).toBeUndefined();
  });

  it("areaCode 가 없으면 거부한다 — 전체 조회는 제공하지 않는다", () => {
    expect(tourismPlacesQuerySchema.safeParse({}).success).toBe(false);
    expect(
      tourismPlacesQuerySchema.safeParse({ sigunguCode: "23" }).success,
    ).toBe(false);
  });

  /** 키워드 검색은 /tourism/search 로 분리돼 있다 */
  it("keyword 는 지역 검색에서 쓰이지 않는다", () => {
    const parsed = tourismPlacesQuerySchema.parse({
      areaCode: "1",
      keyword: "경복궁",
    });

    expect(parsed).not.toHaveProperty("keyword");
  });

  it("limit 규칙은 키워드 검색과 같다", () => {
    expect(tourismPlacesQuerySchema.parse({ areaCode: "1" }).limit).toBe(5);
    expect(
      tourismPlacesQuerySchema.safeParse({ areaCode: "1", limit: "51" })
        .success,
    ).toBe(false);
  });
});

describe("contentIdSchema", () => {
  it("숫자 문자열만 통과시킨다", () => {
    expect(contentIdSchema.parse("126508")).toBe("126508");
    expect(contentIdSchema.safeParse("12a508").success).toBe(false);
    expect(contentIdSchema.safeParse("").success).toBe(false);
    expect(contentIdSchema.safeParse("../../etc").success).toBe(false);
  });
});
