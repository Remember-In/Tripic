import {
  fetchKtoPlaceDetail,
  fetchKtoPlaceImages,
  fetchNearbyKtoPlaces,
  searchKtoPlaces,
  type KtoListItem,
} from "@/shared/api/kto";

export type PlaceMatchMethod = "GPS_CANDIDATE" | "MANUAL_SEARCH";
export type PlaceMatchConfidence = "HIGH" | "MEDIUM" | "LOW" | "MANUAL";

export type TouristPlaceCandidate = {
  address: string;
  areaCode: string;
  categoryCode?: string;
  confidence: PlaceMatchConfidence;
  contentId: string;
  contentTypeId?: string;
  distanceMeters?: number;
  imageUrl?: string;
  matchMethod: PlaceMatchMethod;
  name: string;
  sigunguCode?: string;
};

export function confidenceForCandidate(
  distanceMeters: number | undefined,
  candidateCount: number,
): PlaceMatchConfidence {
  if (distanceMeters === undefined) {
    return "LOW";
  }
  if (distanceMeters <= 100 && candidateCount === 1) {
    return "HIGH";
  }
  if (distanceMeters <= 300) {
    return "MEDIUM";
  }
  return "LOW";
}

function toCandidate(
  item: KtoListItem,
  matchMethod: PlaceMatchMethod,
  candidateCount: number,
): TouristPlaceCandidate {
  return {
    address: item.address,
    areaCode: item.areaCode,
    categoryCode: item.categoryCode,
    confidence:
      matchMethod === "MANUAL_SEARCH"
        ? "MANUAL"
        : confidenceForCandidate(item.distanceMeters, candidateCount),
    contentId: item.contentId,
    contentTypeId: item.contentTypeId,
    distanceMeters: item.distanceMeters,
    imageUrl: item.thumbnailUrl ?? item.imageUrl,
    matchMethod,
    name: item.title,
    sigunguCode: item.sigunguCode,
  };
}

export async function findNearbyTouristPlaces(
  coordinates: { latitude: number; longitude: number },
  signal?: AbortSignal,
) {
  let places = await fetchNearbyKtoPlaces(
    { ...coordinates, radiusMeters: 300 },
    { signal },
  );
  if (places.length === 0) {
    places = await fetchNearbyKtoPlaces(
      { ...coordinates, radiusMeters: 1_000 },
      { signal },
    );
  }

  return places.map((place) =>
    toCandidate(place, "GPS_CANDIDATE", places.length),
  );
}

export async function searchTouristPlaces(
  keyword: string,
  signal?: AbortSignal,
) {
  const places = await searchKtoPlaces(keyword, { signal });
  return places.map((place) =>
    toCandidate(place, "MANUAL_SEARCH", places.length),
  );
}

export { fetchKtoPlaceDetail, fetchKtoPlaceImages };

export const touristPlaceQueryKeys = {
  detail: (contentId: string) => ["tourist-place", "detail", contentId] as const,
  images: (contentId: string) => ["tourist-place", "images", contentId] as const,
  nearby: (photoId: string) => ["tourist-place", "nearby", photoId] as const,
  search: (keyword: string) => ["tourist-place", "search", keyword] as const,
};
