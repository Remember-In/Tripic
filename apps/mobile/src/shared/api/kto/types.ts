export type KtoListItem = {
  address: string;
  areaCode: string;
  categoryCode?: string;
  contentId: string;
  contentTypeId?: string;
  distanceMeters?: number;
  imageUrl?: string;
  sigunguCode?: string;
  thumbnailUrl?: string;
  title: string;
};

export type KtoPlaceDetail = KtoListItem & {
  homepage?: string;
  overview?: string;
  telephone?: string;
};

export type KtoImage = {
  contentId: string;
  originalUrl: string;
  thumbnailUrl?: string;
};

export type KtoArea = {
  code: string;
  name: string;
};
