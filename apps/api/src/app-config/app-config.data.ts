import {
  DEFAULT_RADIUS_M,
  EXPANDED_RADIUS_M,
  MAX_CANDIDATES,
  type AppConfig,
} from "@tripic/shared";

/**
 * 앱 동작 설정 (docs/13-operations-api-design.md §2).
 * 후보 조회 기준(PRD 6.4)의 기본값은 앱과 공유하는 상수를 그대로 쓰고,
 * 원격 조정이 필요할 때 이 파일의 값만 바꿔 재배포한다.
 *
 * 기능 플래그는 **해당 API 가 실제로 존재할 때** true 로 뒤집는다 —
 * 서버에 없는 엔드포인트를 앱이 노출하지 않도록 하는 게 이 스위치의 목적이다.
 * - aiDiary: 신고·필터 구현 전까지 false (docs/11 §3.2, Play AI 정책)
 * - photoUpload: 사진 업로드 API 구현 전까지 false (docs/11 §3.1)
 */
export const APP_CONFIG: AppConfig = {
  kto: {
    defaultRadiusM: DEFAULT_RADIUS_M,
    maxRadiusM: EXPANDED_RADIUS_M,
    maxCandidates: MAX_CANDIDATES,
  },
  features: {
    aiDiary: false,
    photoUpload: false,
  },
};
