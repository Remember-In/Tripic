import { describe, expect, it } from "vitest";
import {
  contentIdSchema,
  tourismPlacesQuerySchema,
} from "@/tourism/tourism.contract";

/**
 * `/tourism` 요청 계약의 경계값을 고정한다.
 * 라우트가 이 스키마를 그대로 쓰므로 여기서 통과/거부가 곧 400 여부가 된다 (docs/15 §4).
 */
describe("tourismPlacesQuerySchema", () => {
  it("키워드 검색을 통과시킨다", () => {
    expect(tourismPlacesQuerySchema.parse({ keyword: "경복궁" })).toMatchObject(
      { keyword: "경복궁" },
    );
  });

  it("지역 검색을 통과시킨다", () => {
    expect(
      tourismPlacesQuerySchema.parse({ areaCode: "1", sigunguCode: "23" }),
    ).toMatchObject({ areaCode: "1", sigunguCode: "23" });
  });

  /** keyword 와 areaCode 를 동시에 받으면 어느 쪽을 쓸지 모호해진다 */
  it("키워드와 지역을 동시에 주면 거부한다", () => {
    expect(
      tourismPlacesQuerySchema.safeParse({ keyword: "경복궁", areaCode: "1" })
        .success,
    ).toBe(false);
  });

  it("둘 다 없으면 거부한다 — 전체 조회는 제공하지 않는다", () => {
    expect(tourismPlacesQuerySchema.safeParse({}).success).toBe(false);
  });

  it("공백뿐인 키워드는 거부한다", () => {
    expect(tourismPlacesQuerySchema.safeParse({ keyword: "   " }).success).toBe(
      false,
    );
  });

  it("sigunguCode 만 있으면 거부한다 — areaCode 없이는 의미가 없다", () => {
    expect(
      tourismPlacesQuerySchema.safeParse({ sigunguCode: "23" }).success,
    ).toBe(false);
  });

  it("limit 기본값은 5 이고 문자열 쿼리도 숫자로 받는다", () => {
    expect(tourismPlacesQuerySchema.parse({ keyword: "서울" }).limit).toBe(5);
    expect(
      tourismPlacesQuerySchema.parse({ keyword: "서울", limit: "20" }).limit,
    ).toBe(20);
  });

  it("limit 상한은 50, 하한은 1", () => {
    expect(
      tourismPlacesQuerySchema.safeParse({ keyword: "서울", limit: "51" })
        .success,
    ).toBe(false);
    expect(
      tourismPlacesQuerySchema.safeParse({ keyword: "서울", limit: "0" })
        .success,
    ).toBe(false);
  });

  /** 좌표는 받지 않는다 — 서버에 닿는 순간 위치정보법 판단이 달라진다 (docs/12 §3-②-1) */
  it("좌표 파라미터는 무시하고 통과시키지 않는다", () => {
    const parsed = tourismPlacesQuerySchema.parse({
      keyword: "서울",
      mapX: "127.0",
      mapY: "37.5",
    });

    expect(parsed).not.toHaveProperty("mapX");
    expect(parsed).not.toHaveProperty("mapY");
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
