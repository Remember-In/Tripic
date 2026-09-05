import type { ImageSourcePropType } from "react-native";

import type { TouristPlaceCandidate } from "@/entities/tourist-place";

export type DraftPhoto = {
  /** 사진 라이브러리에서 다시 찾을 때 사용할 수 있는 플랫폼 asset id */
  assetId?: string;
  /** 메모리에서만 사용하는 EXIF 좌표. Tripic API/SQLite로 직렬화하지 않는다. */
  gps?: {
    latitude: number;
    longitude: number;
  };
  hasGps: boolean;
  height: number;
  id: string;
  source: ImageSourcePropType;
  /** EXIF 촬영일을 시간대 없는 YYYY-MM-DD로 정규화한 값 */
  takenDate?: string;
  /** 선택 직후의 로컬 URI. 기록 저장 시 앱 전용 사본 URI로 교체한다. */
  uri: string;
  width: number;
};

export type DraftVisit = {
  date: string;
  id: string;
  name: string;
  place: TouristPlaceCandidate;
};

export type RecordVoiceTheme = "documentary" | "emotional" | "friendly";

export type RecordTripTheme = "nature" | "history" | "food" | "completion";

export type LocationSearchDecision = "undecided" | "nearby" | "manual";
