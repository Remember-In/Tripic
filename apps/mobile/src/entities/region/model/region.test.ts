import { describe, expect, it } from "vitest";

import {
  collectVisitedAreaCodes,
  KTO_REGIONS,
  summarizeRegionVisits,
} from "./region";

describe("region progress", () => {
  it("keeps only official TourAPI area codes", () => {
    expect([...collectVisitedAreaCodes(["1", "35", "999", null])]).toEqual([
      "1",
      "35",
    ]);
  });

  it("counts repeat visits without inflating visited regions", () => {
    const summary = summarizeRegionVisits(["1", "1", "35"]);

    expect(summary.visitCountByAreaCode["1"]).toBe(2);
    expect(summary.visitedRegionCount).toBe(2);
    expect(summary.totalRegionCount).toBe(17);
  });

  it("provides each of the 17 TourAPI regions once", () => {
    const areaCodes = KTO_REGIONS.map((region) => region.areaCode);

    expect(KTO_REGIONS).toHaveLength(17);
    expect(new Set(areaCodes).size).toBe(17);
  });
});
