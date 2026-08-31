import type { DiaryStyle, RecordTheme } from "@/entities/travel-record";

import type { RecordTripTheme, RecordVoiceTheme } from "./types";

const recordThemeByTripTheme = {
  completion: "REGION_COMPLETE",
  food: "FOOD_EXPERIENCE",
  history: "HISTORY_CULTURE",
  nature: "NATURE_SCENERY",
} as const satisfies Readonly<Record<RecordTripTheme, RecordTheme>>;

const diaryStyleByVoiceTheme = {
  documentary: "DOCU_NARRATION",
  emotional: "EMOTIONAL_ESSAY",
  friendly: "FRIEND_CHAT",
} as const satisfies Readonly<Record<RecordVoiceTheme, DiaryStyle>>;

export function mapRecordTripThemeToRecordTheme(
  theme: RecordTripTheme,
): RecordTheme {
  return recordThemeByTripTheme[theme];
}

export function mapRecordVoiceThemeToDiaryStyle(
  theme: RecordVoiceTheme,
): DiaryStyle {
  return diaryStyleByVoiceTheme[theme];
}
