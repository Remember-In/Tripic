import { useQuery } from "@tanstack/react-query";

import {
  DEFAULT_APP_CONFIG,
  normalizeAppConfig,
} from "@/entities/app-config/model/appConfig";
import { requestJson } from "@/shared/api";

export const APP_CONFIG_QUERY_KEY = ["app-config"] as const;

const FIVE_MINUTES_MS = 5 * 60 * 1_000;

export async function getAppConfig(signal?: AbortSignal) {
  const response = await requestJson<unknown>("/app-config", {
    auth: false,
    signal,
  });

  return normalizeAppConfig(response);
}

export function useAppConfigQuery() {
  return useQuery({
    queryFn: async ({ signal }) => {
      try {
        return await getAppConfig(signal);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }

        return DEFAULT_APP_CONFIG;
      }
    },
    queryKey: APP_CONFIG_QUERY_KEY,
    retry: false,
    staleTime: FIVE_MINUTES_MS,
  });
}
