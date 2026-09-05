import { describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { buildAppConfig } from "@/app-config/app-config.data";
import { validateEnv, type Env } from "@/config/env";

/** 환경변수 검증까지 통과시킨 뒤 ConfigService 로 감싼다 (부팅 경로와 동일) */
const configOf = (
  overrides: Record<string, string>,
): ConfigService<Env, true> =>
  new ConfigService<Env, true>(
    validateEnv({
      DATABASE_URL: "postgresql://x:x@127.0.0.1:5432/x",
      JWT_ACCESS_SECRET: "0123456789abcdef0123456789abcdef",
      KAKAO_APP_ID: "123456",
      ...overrides,
    }),
  );

describe("buildAppConfig", () => {
  it("환경변수가 없으면 PRD 6.4 기본값을 쓴다", () => {
    expect(buildAppConfig(configOf({}))).toEqual({
      kto: { defaultRadiusM: 300, maxRadiusM: 1000, maxCandidates: 5 },
      features: { aiDiary: false, photoUpload: true },
    });
  });

  it("반경·후보 수를 환경변수로 덮는다 (재배포 없이 조정)", () => {
    const config = buildAppConfig(
      configOf({
        KTO_DEFAULT_RADIUS_M: "500",
        KTO_MAX_RADIUS_M: "2000",
        KTO_MAX_CANDIDATES: "8",
      }),
    );

    expect(config.kto).toEqual({
      defaultRadiusM: 500,
      maxRadiusM: 2000,
      maxCandidates: 8,
    });
  });

  it("기능 플래그를 환경변수로 끄고 켠다", () => {
    const config = buildAppConfig(
      configOf({ FEATURE_AI_DIARY: "true", FEATURE_PHOTO_UPLOAD: "false" }),
    );

    expect(config.features).toEqual({ aiDiary: true, photoUpload: false });
  });

  it("숫자가 아니거나 0 이하인 값은 부팅 시점에 막는다", () => {
    expect(() => configOf({ KTO_DEFAULT_RADIUS_M: "안녕" })).toThrow();
    expect(() => configOf({ KTO_MAX_CANDIDATES: "0" })).toThrow();
    expect(() => configOf({ KTO_MAX_RADIUS_M: "-100" })).toThrow();
  });

  it("불리언이 아닌 플래그 값도 부팅 시점에 막는다", () => {
    expect(() => configOf({ FEATURE_PHOTO_UPLOAD: "아마도" })).toThrow();
  });
});
