import type { KtoListItem } from "@tripic/shared";

import { requestJson } from "@/shared/api/http";

export type TouristPlace = KtoListItem;

const PREVIEW_PLACES: TouristPlace[] = [
  {
    address: "서울특별시 종로구 사직로 161",
    areaCode: "1",
    contentId: "preview-gyeongbokgung",
    sigunguCode: "23",
    title: "경복궁",
  },
  {
    address: "서울특별시 중구 을지로 281",
    areaCode: "1",
    contentId: "preview-ddp",
    sigunguCode: "24",
    title: "동대문디자인플라자",
  },
  {
    address: "부산광역시 해운대구 우동",
    areaCode: "6",
    contentId: "preview-haeundae",
    sigunguCode: "16",
    title: "해운대해수욕장",
  },
];

function isPreview() {
  return (
    import.meta.env.DEV && sessionStorage.getItem("tripic-preview") === "1"
  );
}

export async function searchTouristPlaces(keyword: string) {
  const normalized = keyword.trim();
  if (!normalized) return [];

  if (isPreview()) {
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    const matched = PREVIEW_PLACES.filter(
      (place) =>
        place.title.includes(normalized) || place.address.includes(normalized),
    );
    return matched.length > 0 ? matched : PREVIEW_PLACES;
  }

  return requestJson<TouristPlace[]>(
    `/tourism/search?keyword=${encodeURIComponent(normalized)}&limit=10`,
    { auth: true },
  );
}

export function getTouristPlace(contentId: string) {
  if (isPreview()) {
    return Promise.resolve(
      PREVIEW_PLACES.find((place) => place.contentId === contentId) ?? null,
    );
  }

  return requestJson<TouristPlace>(`/tourism/places/${contentId}`, {
    auth: true,
  });
}
