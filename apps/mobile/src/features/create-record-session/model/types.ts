import type { ImageSourcePropType } from "react-native";

export type DraftPhoto = {
  /** 메모리에서만 사용하는 EXIF 좌표. Tripic API/SQLite로 직렬화하지 않는다. */
  gps?: {
    latitude: number;
    longitude: number;
  };
  hasGps: boolean;
  id: string;
  source: ImageSourcePropType;
  /** EXIF 촬영일을 시간대 없는 YYYY-MM-DD로 정규화한 값 */
  takenDate?: string;
};

export type DraftVisit = {
  date: string;
  id: string;
  name: string;
};

export type RecordVoiceTheme = "documentary" | "emotional" | "friendly";

export type RecordTripTheme = "nature" | "history" | "food" | "completion";
