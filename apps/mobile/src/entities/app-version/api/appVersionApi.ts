import { useQuery } from "@tanstack/react-query";

import { normalizeAppVersion } from "@/entities/app-version/model/appVersion";
import { requestJson } from "@/shared/api";

export const APP_VERSION_QUERY_KEY = ["app-version"] as const;

const FIVE_MINUTES_MS = 5 * 60 * 1_000;

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export async function getAppVersion(signal?: AbortSignal) {
  const response = await requestJson<unknown>("/version", {
    auth: false,
    signal,
  });

  return normalizeAppVersion(response);
}

export function useAppVersionQuery() {
  return useQuery({
    queryFn: async ({ signal }) => {
      try {
        return await getAppVersion(signal);
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        // 버전 API 장애만으로 정상 버전의 앱을 차단하지 않는다.
        return null;
      }
    },
    queryKey: APP_VERSION_QUERY_KEY,
    retry: false,
    staleTime: FIVE_MINUTES_MS,
  });
}
