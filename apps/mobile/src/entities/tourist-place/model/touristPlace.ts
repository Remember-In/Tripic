import {
  fetchKtoPlaceDetail,
  fetchKtoPlaceImages,
  fetchKtoPlacesByArea,
  fetchNearbyKtoPlaces,
  searchKtoPlaces,
  type KtoListItem,
} from "@/shared/api/kto";

export type PlaceMatchMethod =
  "GPS_CANDIDATE" | "MANUAL_SEARCH" | "MANUAL_REGION_SELECT";
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

/**
 * TourAPI가 간혹 HTTP 이미지 주소를 내려줘도 앱의 cleartext 허용 범위를
 * 넓히지 않도록 HTTPS 주소만 화면에 전달한다.
 */
export function normalizeTouristImageUrl(url: string | undefined) {
  const normalizedUrl = url?.trim();
  if (!normalizedUrl) {
    return undefined;
  }

  if (/^https:\/\//i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  if (/^http:\/\//i.test(normalizedUrl)) {
    return normalizedUrl.replace(/^http:\/\//i, "https://");
  }

  return undefined;
}

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
): TouristPlaceCandidate | null {
  if (!item.areaCode) {
    return null;
  }

  return {
    address: item.address,
    areaCode: item.areaCode,
    categoryCode: item.categoryCode,
    confidence:
      matchMethod === "GPS_CANDIDATE"
        ? confidenceForCandidate(item.distanceMeters, candidateCount)
        : "MANUAL",
    contentId: item.contentId,
    contentTypeId: item.contentTypeId,
    distanceMeters: item.distanceMeters,
    imageUrl: normalizeTouristImageUrl(item.thumbnailUrl ?? item.imageUrl),
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

  return places.flatMap((place) => {
    const candidate = toCandidate(place, "GPS_CANDIDATE", places.length);
    return candidate ? [candidate] : [];
  });
}

export async function searchTouristPlaces(
  keyword: string,
  signal?: AbortSignal,
) {
  const places = await searchKtoPlaces(keyword, { signal });
  return places.flatMap((place) => {
    const candidate = toCandidate(place, "MANUAL_SEARCH", places.length);
    return candidate ? [candidate] : [];
  });
}

export async function browseTouristPlacesByArea(
  areaCode?: string,
  signal?: AbortSignal,
) {
  const places = await fetchKtoPlacesByArea(
    { areaCode: areaCode?.trim() || undefined },
    { signal },
  );

  return places
    .flatMap((place) => {
      const candidate = toCandidate(
        place,
        "MANUAL_REGION_SELECT",
        places.length,
      );
      return candidate ? [candidate] : [];
    })
    .slice(0, 5);
}

export { fetchKtoPlaceDetail, fetchKtoPlaceImages };

export const touristPlaceQueryKeys = {
  detail: (contentId: string) =>
    ["tourist-place", "detail", contentId] as const,
  images: (contentId: string) =>
    ["tourist-place", "images", contentId] as const,
  area: (areaCode?: string) =>
    ["tourist-place", "area", areaCode ?? "all"] as const,
  nearby: (photoId: string) => ["tourist-place", "nearby", photoId] as const,
  search: (keyword: string) => ["tourist-place", "search", keyword] as const,
};
