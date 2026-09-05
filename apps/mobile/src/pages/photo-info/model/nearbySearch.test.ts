import { describe, expect, it } from "vitest";

import { canStartNearbySearch } from "./nearbySearch";

const readyInput = {
  hasCoordinates: true,
  isAppConfigPending: false,
  isKeywordMode: false,
  locationSearchDecision: "nearby" as const,
  selectedAreaCode: undefined,
};

describe("canStartNearbySearch", () => {
  it("waits for remote app configuration before consuming transient GPS", () => {
    expect(
      canStartNearbySearch({ ...readyInput, isAppConfigPending: true }),
    ).toBe(false);
    expect(canStartNearbySearch(readyInput)).toBe(true);
  });

  it("does not search after the user switches to a manual search mode", () => {
    expect(canStartNearbySearch({ ...readyInput, isKeywordMode: true })).toBe(
      false,
    );
    expect(
      canStartNearbySearch({ ...readyInput, selectedAreaCode: null }),
    ).toBe(false);
  });
});
