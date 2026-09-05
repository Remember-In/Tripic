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

export const MAX_KTO_LIST_CANDIDATES = 50;
export const MAX_KTO_RADIUS_METERS = 20_000;

export type KtoAreaSearchInput = {
  areaCode?: string;
  sigunguCode?: string;
};

export type KtoRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type KtoListRequestOptions = KtoRequestOptions & {
  maxCandidates?: number;
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
