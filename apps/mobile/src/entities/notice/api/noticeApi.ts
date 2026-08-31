import { useQuery } from "@tanstack/react-query";

import { normalizeNotices } from "@/entities/notice/model/notice";
import { requestJson } from "@/shared/api";

export const NOTICES_QUERY_KEY = ["notices"] as const;

const FIVE_MINUTES_MS = 5 * 60 * 1_000;

export async function getNotices(signal?: AbortSignal) {
  const response = await requestJson<unknown>("/notices", {
    auth: false,
    signal,
  });

  return normalizeNotices(response);
}

export function useNoticesQuery() {
  return useQuery({
    queryFn: ({ signal }) => getNotices(signal),
    queryKey: NOTICES_QUERY_KEY,
    staleTime: FIVE_MINUTES_MS,
  });
}
