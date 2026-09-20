import { describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { readTourismConfig } from "@/config/tourism-config";
import { validateEnv, type Env } from "@/config/env";

const baseEnv = {
  DATABASE_URL: "postgresql://x:x@127.0.0.1:5432/x",
  JWT_ACCESS_SECRET: "0123456789abcdef0123456789abcdef",
  KAKAO_APP_ID: "123456",
};

const configOf = (overrides: Record<string, string> = {}) =>
  new ConfigService<Env, true>(validateEnv({ ...baseEnv, ...overrides }));

describe("readTourismConfig (docs/15 §4)", () => {
  it("서비스키가 있으면 adapter 가 쓸 설정 묶음을 돌려준다", () => {
    expect(
      readTourismConfig(configOf({ KTO_SERVICE_KEY: "plain-service-key" })),
    ).toEqual({ serviceKey: "plain-service-key" });
  });

  it("서비스키를 비운 서버면 null — TourAPI 프록시 비활성", () => {
    expect(readTourismConfig(configOf())).toBeNull();
  });

  /**
   * 공공데이터포털은 인코딩·디코딩 두 형태의 키를 준다.
   * 인코딩 값을 그대로 쿼리에 실으면 이중 인코딩되어 인증에 실패하므로 한 번 되돌린다.
   */
  it("URL 인코딩된 키는 한 번 디코딩해서 쓴다", () => {
    const decoded = "abc+/=def";
    const encoded = encodeURIComponent(decoded);

    expect(configOf({ KTO_SERVICE_KEY: encoded })).toBeDefined();
    expect(readTourismConfig(configOf({ KTO_SERVICE_KEY: encoded }))).toEqual({
      serviceKey: decoded,
    });
  });

  it("디코딩할 수 없는 값은 원문 그대로 쓴다 — 키를 잃지 않는다", () => {
    expect(readTourismConfig(configOf({ KTO_SERVICE_KEY: "100%key" }))).toEqual(
      { serviceKey: "100%key" },
    );
  });

  it("앞뒤 공백은 다듬는다", () => {
    expect(
      readTourismConfig(configOf({ KTO_SERVICE_KEY: "  spaced-key  " })),
    ).toEqual({ serviceKey: "spaced-key" });
  });
});
