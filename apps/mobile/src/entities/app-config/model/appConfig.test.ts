import { describe, expect, it } from "vitest";

import { DEFAULT_APP_CONFIG, normalizeAppConfig } from "./appConfig";

describe("normalizeAppConfig", () => {
  it("keeps unfinished features disabled unless the server explicitly enables them", () => {
    expect(DEFAULT_APP_CONFIG.features.photoUpload).toBe(false);
    expect(normalizeAppConfig({}).features).toEqual({
      aiDiary: false,
      photoUpload: false,
    });
    expect(
      normalizeAppConfig({ features: { aiDiary: 1, photoUpload: "true" } })
        .features,
    ).toEqual({ aiDiary: false, photoUpload: false });
    expect(
      normalizeAppConfig({ features: { aiDiary: true, photoUpload: true } })
        .features,
    ).toEqual({ aiDiary: true, photoUpload: true });
  });

  it("normalizes KTO limits and never lets the initial radius exceed the maximum", () => {
    expect(
      normalizeAppConfig({
        kto: {
          defaultRadiusM: 2_000,
          maxCandidates: 7,
          maxRadiusM: 1_000,
        },
      }).kto,
    ).toEqual({
      defaultRadiusM: 1_000,
      maxCandidates: 7,
      maxRadiusM: 1_000,
    });

    expect(
      normalizeAppConfig({
        kto: { defaultRadiusM: 0, maxCandidates: -1, maxRadiusM: "1000" },
      }).kto,
    ).toEqual(DEFAULT_APP_CONFIG.kto);

    expect(
      normalizeAppConfig({ kto: { maxCandidates: 1_000 } }).kto.maxCandidates,
    ).toBe(50);

    expect(
      normalizeAppConfig({
        kto: { defaultRadiusM: 50_000, maxRadiusM: 40_000 },
      }).kto,
    ).toEqual({
      defaultRadiusM: 20_000,
      maxCandidates: DEFAULT_APP_CONFIG.kto.maxCandidates,
      maxRadiusM: 20_000,
    });
  });
});
