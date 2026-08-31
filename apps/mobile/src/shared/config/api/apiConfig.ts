const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(
  /\/+$/,
  "",
);

export const apiConfig = {
  baseUrl: configuredBaseUrl ?? "",
  isConfigured: Boolean(configuredBaseUrl),
} as const;

export class ApiConfigurationError extends Error {
  constructor() {
    super(
      "EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다. apps/mobile/.env.example을 참고해 주세요.",
    );
    this.name = "ApiConfigurationError";
  }
}

export function getApiBaseUrl() {
  if (!apiConfig.baseUrl) {
    throw new ApiConfigurationError();
  }

  return apiConfig.baseUrl;
}
