import { describe, expect, it } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { DisabledTourApiAdapter } from "@/tourism/adapters/disabled-tour-api.adapter";
import { KtoApiAdapter } from "@/tourism/adapters/kto-api.adapter";
import { selectKtoClient } from "@/tourism/tourism-adapters";

describe("selectKtoClient (docs/15 §4)", () => {
  it("서비스키가 있으면 실제 adapter 를 고른다", () => {
    expect(selectKtoClient({ serviceKey: "kto-service-key" })).toBeInstanceOf(
      KtoApiAdapter,
    );
  });

  it("설정이 없으면 비활성 adapter 를 고른다 — 서비스는 설정 여부를 모른다", () => {
    expect(selectKtoClient(null)).toBeInstanceOf(DisabledTourApiAdapter);
  });
});

describe("DisabledTourApiAdapter", () => {
  const adapter = new DisabledTourApiAdapter();

  it.each([
    ["searchByKeyword", () => adapter.searchByKeyword("서울", 5)],
    ["findByArea", () => adapter.findByArea({ areaCode: "1" }, 5)],
    ["findDetail", () => adapter.findDetail("126508")],
    ["findImages", () => adapter.findImages("126508")],
    ["listAreas", () => adapter.listAreas()],
  ])("%s 는 503 으로 막는다", async (_name, call) => {
    await expect(call()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
