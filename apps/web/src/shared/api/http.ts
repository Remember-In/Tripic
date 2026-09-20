type AccessTokenListener = (accessToken: string | null) => void;

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
const listeners = new Set<AccessTokenListener>();

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function setAccessToken(nextAccessToken: string | null) {
  accessToken = nextAccessToken;
  listeners.forEach((listener) => listener(nextAccessToken));
}

export function subscribeToAccessToken(listener: AccessTokenListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    // JSON 오류 본문이 아닌 경우 상태 코드 기반 메시지를 사용한다.
  }
  return response.status === 401
    ? "로그인이 만료되었습니다. 다시 로그인해 주세요."
    : `요청을 처리하지 못했습니다. (${response.status})`;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh/web", {
      credentials: "include",
      method: "POST",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { accessToken?: unknown };
        return typeof body.accessToken === "string" ? body.accessToken : null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  const refreshed = await refreshPromise;
  setAccessToken(refreshed);
  return refreshed;
}

type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  auth?: boolean;
  headers?: HeadersInit;
};

export async function apiFetch(
  path: `/${string}`,
  options: ApiRequestOptions = {},
) {
  const request = (token: string | null) => {
    const headers = new Headers(options.headers);
    if (options.auth && token) headers.set("Authorization", `Bearer ${token}`);

    return fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      headers,
    });
  };

  let response = await request(accessToken);
  if (options.auth && response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) response = await request(refreshed);
  }
  return response;
}

export async function requestJson<T>(
  path: `/${string}`,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await apiFetch(path, { ...options, headers });
  if (!response.ok)
    throw new ApiError(response.status, await parseError(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function requestBlob(path: `/${string}`) {
  const response = await apiFetch(path, { auth: true });
  if (!response.ok)
    throw new ApiError(response.status, await parseError(response));
  return response.blob();
}
