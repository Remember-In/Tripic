import type { RegionProgress } from "@tripic/shared";

import { requestJson } from "@/shared/api/http";

export type RecordPlace = {
  areaCode: string;
  categoryCode?: string;
  contentId: string;
  createdAt: string;
  id: string;
  recordId: string;
  sigunguCode?: string;
  visitedAt: string;
};

export type MapProgress = {
  recordedPlaceCount: number;
  regions: RegionProgress[];
  totalAreaCount: number;
  visitedAreaCount: number;
};

export function createRecordPlace(
  recordId: string,
  input: { contentId: string; visitedAt: string },
) {
  return requestJson<RecordPlace>(`/records/${recordId}/places`, {
    auth: true,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function listRecordPlaces(recordId: string) {
  return requestJson<RecordPlace[]>(`/records/${recordId}/places`, {
    auth: true,
  });
}

export function updateRecordPlace(
  recordId: string,
  placeId: string,
  input: { contentId?: string; visitedAt?: string },
) {
  return requestJson<RecordPlace>(`/records/${recordId}/places/${placeId}`, {
    auth: true,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export function deleteRecordPlace(recordId: string, placeId: string) {
  return requestJson<void>(`/records/${recordId}/places/${placeId}`, {
    auth: true,
    method: "DELETE",
  });
}

export function getMapProgress() {
  return requestJson<MapProgress>("/map/progress", { auth: true });
}
