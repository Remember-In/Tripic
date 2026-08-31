import { compareSemver, type AppVersionPolicy } from "@/entities/app-version";

export type AppUpdatePlatform = "android" | "ios";

export type RequiredAppUpdate = Readonly<{
  currentVersion: string;
  minSupportedVersion: string;
  updateUrl: string;
}>;

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 현재 앱이 최소 지원 버전보다 낮고 현재 플랫폼의 안전한 스토어 URL이 있을 때만
 * 차단 업데이트 정보를 반환한다. 판단할 수 없는 상태는 모두 정상 진입시킨다.
 */
export function resolveRequiredAppUpdate(
  policy: AppVersionPolicy | null | undefined,
  currentVersion: string | null | undefined,
  platform: string,
): RequiredAppUpdate | null {
  if (
    !policy ||
    !currentVersion ||
    (platform !== "android" && platform !== "ios")
  ) {
    return null;
  }

  const updateUrl = policy.updateUrl?.[platform];
  const comparison = compareSemver(currentVersion, policy.minSupportedVersion);

  if (!updateUrl || !isHttpsUrl(updateUrl) || comparison === null) {
    return null;
  }

  if (comparison >= 0) {
    return null;
  }

  return {
    currentVersion,
    minSupportedVersion: policy.minSupportedVersion,
    updateUrl,
  };
}
