import { requestJson } from "@/shared/api/http";

export type TouristPlace = {
  address: string;
  areaCode: string;
  contentId: string;
  name: string;
  sigunguCode?: string;
};

const PREVIEW_PLACES: TouristPlace[] = [
  {
    address: "서울특별시 종로구 사직로 161",
    areaCode: "1",
    contentId: "preview-gyeongbokgung",
    name: "경복궁",
    sigunguCode: "23",
  },
  {
    address: "서울특별시 중구 을지로 281",
    areaCode: "1",
    contentId: "preview-ddp",
    name: "동대문디자인플라자",
    sigunguCode: "24",
  },
  {
    address: "부산광역시 해운대구 우동",
    areaCode: "6",
    contentId: "preview-haeundae",
    name: "해운대해수욕장",
    sigunguCode: "16",
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
        place.name.includes(normalized) || place.address.includes(normalized),
    );
    return matched.length > 0 ? matched : PREVIEW_PLACES;
  }

  return requestJson<TouristPlace[]>(
    `/tourism/search?keyword=${encodeURIComponent(normalized)}`,
    { auth: true },
  );
}
