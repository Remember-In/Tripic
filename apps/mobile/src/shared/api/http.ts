import { getApiBaseUrl } from "@/shared/config/api";

type ApiAuthHandlers = {
  clearSession: () => Promise<void> | void;
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
};

export type RequestJsonOptions = {
  auth?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  signal?: AbortSignal;
};

export type ValidationIssue = {
  message: string;
  path: string;
};

let authHandlers: ApiAuthHandlers | null = null;

export class ApiError extends Error {
  readonly issues: readonly ValidationIssue[];
  readonly responseBody: unknown;
  readonly status: number;

  constructor({
    issues = [],
    message,
    responseBody,
    status,
  }: {
    issues?: readonly ValidationIssue[];
    message: string;
    responseBody?: unknown;
    status: number;
  }) {
    super(message);
    this.name = "ApiError";
    this.issues = issues;
    this.responseBody = responseBody;
    this.status = status;
  }
}

export class ApiNetworkError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super("서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.");
    this.name = "ApiNetworkError";
    this.cause = cause;
  }
}

export function configureApiAuth(handlers: ApiAuthHandlers | null) {
  authHandlers = handlers;
}

function parseIssues(value: unknown): ValidationIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((issue) => {
    if (!issue || typeof issue !== "object") {
      return [];
    }

    const candidate = issue as { message?: unknown; path?: unknown };
    if (typeof candidate.message !== "string") {
      return [];
    }

    const path = Array.isArray(candidate.path)
      ? candidate.path.join(".")
      : typeof candidate.path === "string"
        ? candidate.path
        : "";

    return [{ message: candidate.message, path }];
  });
}

function errorMessage(status: number, body: unknown) {
  if (body && typeof body === "object") {
    const message = (body as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      const messages = message.filter(
        (item): item is string => typeof item === "string",
      );
      if (messages.length > 0) {
        return messages.join("\n");
      }
    }
  }

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (status === 401) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }

  return `요청을 처리하지 못했습니다. (${status})`;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  const text = await response.text();
  return text || undefined;
}

async function performRequest(
  path: string,
  options: RequestJsonOptions,
  accessToken: string | null,
) {
  // 설정 오류는 네트워크 장애로 감싸지 않고 호출 화면에 그대로 전달한다.
  const baseUrl = getApiBaseUrl();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    return await fetch(`${baseUrl}${path}`, {
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      headers,
      method: options.method ?? "GET",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ApiNetworkError(error);
  }
}

export async function requestJson<T = unknown>(
  path: `/${string}`,
  options: RequestJsonOptions = {},
): Promise<T> {
  const requiresAuth = options.auth ?? false;
  const initialAccessToken = requiresAuth
    ? (authHandlers?.getAccessToken() ?? null)
    : null;

  let response = await performRequest(path, options, initialAccessToken);

  if (requiresAuth && response.status === 401 && authHandlers) {
    const refreshedAccessToken = await authHandlers.refreshAccessToken();

    if (refreshedAccessToken) {
      response = await performRequest(path, options, refreshedAccessToken);
    }

    if (response.status === 401 || !refreshedAccessToken) {
      await authHandlers.clearSession();
    }
  }

  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    const candidate =
      responseBody && typeof responseBody === "object"
        ? (responseBody as { issues?: unknown })
        : null;

    throw new ApiError({
      issues: parseIssues(candidate?.issues),
      message: errorMessage(response.status, responseBody),
      responseBody,
      status: response.status,
    });
  }

  return responseBody as T;
}
