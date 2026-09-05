import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchKtoPlacesByArea,
  fetchNearbyKtoPlaces,
  searchKtoPlaces,
  type KtoListItem,
} from "@/shared/api/kto";

import {
  browseTouristPlacesByArea,
  confidenceForCandidate,
  findNearbyTouristPlaces,
  normalizeTouristImageUrl,
  searchTouristPlaces,
  touristPlaceQueryKeys,
} from "./touristPlace";

vi.mock("@/shared/api/kto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/kto")>();
  return {
    ...actual,
    fetchKtoPlacesByArea: vi.fn(),
    fetchNearbyKtoPlaces: vi.fn(),
    searchKtoPlaces: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(fetchKtoPlacesByArea).mockReset();
  vi.mocked(fetchNearbyKtoPlaces).mockReset();
  vi.mocked(searchKtoPlaces).mockReset();
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
  it("uses the configured candidate limit for manual region candidates", async () => {
    const places: KtoListItem[] = Array.from({ length: 6 }, (_, index) => ({
      address: `서울 주소 ${index + 1}`,
      areaCode: "1",
      contentId: String(index + 1),
      title: `서울 관광지 ${index + 1}`,
    }));
    const signal = new AbortController().signal;
    vi.mocked(fetchKtoPlacesByArea).mockResolvedValue(places);

    const candidates = await browseTouristPlacesByArea({
      areaCode: " 1 ",
      maxCandidates: 3,
      signal,
    });

    expect(fetchKtoPlacesByArea).toHaveBeenCalledWith(
      { areaCode: "1" },
      { maxCandidates: 3, signal },
    );
    expect(candidates).toHaveLength(3);
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

describe("tourist place server configuration", () => {
  it("expands a nearby search from the default radius to the maximum radius", async () => {
    const place: KtoListItem = {
      address: "서울 주소",
      areaCode: "1",
      contentId: "1",
      distanceMeters: 450,
      title: "서울 관광지",
    };
    const signal = new AbortController().signal;
    vi.mocked(fetchNearbyKtoPlaces)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([place]);

    const candidates = await findNearbyTouristPlaces(
      { latitude: 37.5, longitude: 127 },
      {
        defaultRadiusM: 250,
        maxCandidates: 7,
        maxRadiusM: 900,
        signal,
      },
    );

    expect(fetchNearbyKtoPlaces).toHaveBeenNthCalledWith(
      1,
      { latitude: 37.5, longitude: 127, radiusMeters: 250 },
      { maxCandidates: 7, signal },
    );
    expect(fetchNearbyKtoPlaces).toHaveBeenNthCalledWith(
      2,
      { latitude: 37.5, longitude: 127, radiusMeters: 900 },
      { maxCandidates: 7, signal },
    );
    expect(candidates).toHaveLength(1);
  });

  it("passes the configured limit to keyword search and keeps it in query keys", async () => {
    const signal = new AbortController().signal;
    vi.mocked(searchKtoPlaces).mockResolvedValue([]);

    await searchTouristPlaces("경복궁", { maxCandidates: 8, signal });

    expect(searchKtoPlaces).toHaveBeenCalledWith("경복궁", {
      maxCandidates: 8,
      signal,
    });
    expect(touristPlaceQueryKeys.search("경복궁", 8)).toEqual([
      "tourist-place",
      "search",
      "경복궁",
      8,
    ]);
    expect(touristPlaceQueryKeys.area("1", 8)).toEqual([
      "tourist-place",
      "area",
      "1",
      8,
    ]);
  });
});
