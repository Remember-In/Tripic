import type { VersionInfo } from "@tripic/shared";

/**
 * 앱 최소 지원 버전 (docs/13-operations-api-design.md §2).
 * DB 없이 상수로 서빙한다 — 값 변경 = 재배포.
 *
 * `updateUrl` 은 스토어 등록 후 확정되므로 그때까지 필드를 생략한다
 * (빈 문자열을 내려보내면 앱이 유효한 URL 로 오인한다).
 */
export const VERSION_INFO: VersionInfo = {
  minSupportedVersion: "1.0.0",
  latestVersion: "1.0.0",
};
