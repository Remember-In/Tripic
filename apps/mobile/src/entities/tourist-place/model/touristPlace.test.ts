import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchKtoPlacesByArea, type KtoListItem } from "@/shared/api/kto";

import {
  browseTouristPlacesByArea,
  confidenceForCandidate,
  normalizeTouristImageUrl,
} from "./touristPlace";

vi.mock("@/shared/api/kto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/kto")>();
  return { ...actual, fetchKtoPlacesByArea: vi.fn() };
});

beforeEach(() => {
  vi.mocked(fetchKtoPlacesByArea).mockReset();
});

describe("tourist place confidence", () => {
  it("marks a single candidate within 100m as high confidence", () => {
    expect(confidenceForCandidate(80, 1)).toBe("HIGH");
  });

  it("does not auto-confirm ambiguous or distant candidates", () => {
    expect(confidenceForCandidate(80, 2)).toBe("MEDIUM");
    expect(confidenceForCandidate(301, 1)).toBe("LOW");
    expect(confidenceForCandidate(undefined, 1)).toBe("LOW");
  });
});

describe("tourist place image URL", () => {
  it("upgrades TourAPI HTTP images without enabling app-wide cleartext", () => {
    expect(normalizeTouristImageUrl("http://example.com/place.jpg")).toBe(
      "https://example.com/place.jpg",
    );
    expect(normalizeTouristImageUrl("https://example.com/place.jpg")).toBe(
      "https://example.com/place.jpg",
    );
  });

  it("rejects empty and non-web image sources", () => {
    expect(normalizeTouristImageUrl(undefined)).toBeUndefined();
    expect(
      normalizeTouristImageUrl("file:///private/photo.jpg"),
    ).toBeUndefined();
  });
});

describe("tourist place area browsing", () => {
  it("returns at most five manual region candidates", async () => {
    const places: KtoListItem[] = Array.from({ length: 6 }, (_, index) => ({
      address: `서울 주소 ${index + 1}`,
      areaCode: "1",
      contentId: String(index + 1),
      title: `서울 관광지 ${index + 1}`,
    }));
    const signal = new AbortController().signal;
    vi.mocked(fetchKtoPlacesByArea).mockResolvedValue(places);

    const candidates = await browseTouristPlacesByArea(" 1 ", signal);

    expect(fetchKtoPlacesByArea).toHaveBeenCalledWith(
      { areaCode: "1" },
      { signal },
    );
    expect(candidates).toHaveLength(5);
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          confidence: "MANUAL",
          matchMethod: "MANUAL_REGION_SELECT",
        }),
      ]),
    );
    expect(
      candidates.every(
        (candidate) =>
          candidate.confidence === "MANUAL" &&
          candidate.matchMethod === "MANUAL_REGION_SELECT",
      ),
    ).toBe(true);
  });
});
