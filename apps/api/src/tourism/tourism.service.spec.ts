import { describe, expect, it, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import type {
  KtoArea,
  KtoImage,
  KtoListItem,
  KtoPlaceDetail,
} from "@tripic/shared";
import { TourismService } from "@/tourism/tourism.service";
import type { KtoAreaFilter, KtoClient } from "@/tourism/ports/kto-client.port";

const place = (contentId: string): KtoListItem => ({
  address: "서울 종로구",
  areaCode: "1",
  contentId,
  title: `관광지 ${contentId}`,
});

/** port 계약대로 동작하는 in-memory fake (CLAUDE.md: mock 대신 fake) */
class FakeKtoClient implements KtoClient {
  keywordCalls: Array<{ keyword: string; limit: number }> = [];
  areaCalls: Array<{ filter: KtoAreaFilter; limit: number }> = [];
  detail: KtoPlaceDetail | null = { ...place("126508"), overview: "소개" };
  images: readonly KtoImage[] = [
    { contentId: "126508", originalUrl: "https://img.example/a.jpg" },
  ];
  areas: readonly KtoArea[] = [{ code: "1", name: "서울" }];

  async searchByKeyword(keyword: string, limit: number) {
    this.keywordCalls.push({ keyword, limit });
    return [place("1"), place("2")];
  }

  async findByArea(filter: KtoAreaFilter, limit: number) {
    this.areaCalls.push({ filter, limit });
    return [place("3")];
  }

  async findDetail(_contentId: string) {
    return this.detail;
  }

  async findImages(_contentId: string) {
    return this.images;
  }

  async listAreas() {
    return this.areas;
  }
}

describe("TourismService (docs/15 §4)", () => {
  let client: FakeKtoClient;
  let service: TourismService;

  beforeEach(() => {
    client = new FakeKtoClient();
    service = new TourismService(client);
  });

  it("키워드 검색은 키워드 port 로만 보낸다", async () => {
    const places = await service.search({ keyword: "경복궁", limit: 5 });

    expect(client.keywordCalls).toEqual([{ keyword: "경복궁", limit: 5 }]);
    expect(client.areaCalls).toEqual([]);
    expect(places).toHaveLength(2);
  });

  it("지역 검색은 지역 port 로만 보낸다", async () => {
    await service.findPlaces({ areaCode: "1", sigunguCode: "23", limit: 10 });

    expect(client.areaCalls).toEqual([
      { filter: { areaCode: "1", sigunguCode: "23" }, limit: 10 },
    ]);
    expect(client.keywordCalls).toEqual([]);
  });

  it("시군구 없이 시·도만으로도 지역 검색을 보낸다", async () => {
    await service.findPlaces({ areaCode: "1", limit: 5 });

    expect(client.areaCalls).toEqual([
      { filter: { areaCode: "1", sigunguCode: undefined }, limit: 5 },
    ]);
  });

  it("상세를 그대로 돌려준다", async () => {
    await expect(service.findDetail("126508")).resolves.toMatchObject({
      contentId: "126508",
      overview: "소개",
    });
  });

  it("상세가 없으면 404 — 프록시가 빈 본문을 200 으로 내보내지 않는다", async () => {
    client.detail = null;

    await expect(service.findDetail("999")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("이미지와 지역 목록을 그대로 돌려준다", async () => {
    await expect(service.findImages("126508")).resolves.toHaveLength(1);
    await expect(service.listAreas()).resolves.toEqual([
      { code: "1", name: "서울" },
    ]);
  });
});
