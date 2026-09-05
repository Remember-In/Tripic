import { useQuery } from "@tanstack/react-query";

import {
  DEFAULT_APP_CONFIG,
  normalizeAppConfig,
} from "@/entities/app-config/model/appConfig";
import { requestJson } from "@/shared/api";

export const APP_CONFIG_QUERY_KEY = ["app-config"] as const;
export const APP_CONFIG_REQUEST_TIMEOUT_MS = 4_000;

const FIVE_MINUTES_MS = 5 * 60 * 1_000;

type GetAppConfigOptions = Readonly<{
  signal?: AbortSignal;
  timeoutMs?: number;
}>;

export class AppConfigTimeoutError extends Error {
  constructor() {
    super("앱 설정 요청 시간이 초과되었습니다.");
    this.name = "AppConfigTimeoutError";
  }
}

function externalAbortReason(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) {
    return signal.reason;
  }

  const error = new Error("앱 설정 요청이 취소되었습니다.");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export async function getAppConfig(options: GetAppConfigOptions = {}) {
  const requestController = new AbortController();
  const timeoutError = new AppConfigTimeoutError();
  const externalSignal = options.signal;
  let didTimeOut = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let handleExternalAbort: (() => void) | undefined;

  if (externalSignal?.aborted) {
    throw externalAbortReason(externalSignal);
  }

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      didTimeOut = true;
      requestController.abort();
      reject(timeoutError);
    }, options.timeoutMs ?? APP_CONFIG_REQUEST_TIMEOUT_MS);
  });
  const externalAbortPromise = externalSignal
    ? new Promise<never>((_resolve, reject) => {
        handleExternalAbort = () => {
          requestController.abort();
          reject(externalAbortReason(externalSignal));
        };
        externalSignal.addEventListener("abort", handleExternalAbort, {
          once: true,
        });
      })
    : undefined;

  try {
    const response = await Promise.race([
      requestJson<unknown>("/app-config", {
        auth: false,
        signal: requestController.signal,
      }),
      timeoutPromise,
      ...(externalAbortPromise ? [externalAbortPromise] : []),
    ]);

    return normalizeAppConfig(response);
  } catch (error) {
    if (externalSignal?.aborted) {
      throw externalAbortReason(externalSignal);
    }
    if (didTimeOut) {
      throw timeoutError;
    }
    throw error;
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    if (handleExternalAbort) {
      externalSignal?.removeEventListener("abort", handleExternalAbort);
    }
  }
}

export async function getAppConfigOrDefault(options: GetAppConfigOptions = {}) {
  try {
    return await getAppConfig(options);
  } catch (error) {
    if (options.signal?.aborted) {
      throw externalAbortReason(options.signal);
    }
    if (isAbortError(error)) {
      throw error;
    }

    return DEFAULT_APP_CONFIG;
  }
}

export function useAppConfigQuery() {
  return useQuery({
    queryFn: ({ signal }) => getAppConfigOrDefault({ signal }),
    queryKey: APP_CONFIG_QUERY_KEY,
    retry: false,
    staleTime: FIVE_MINUTES_MS,
  });
}
