import { z } from "zod";

/**
 * 여행 기록 콘텐츠 요청/응답 계약 (docs/11-records-api-design.md §3~§5).
 * 앱(RN)과 서버(NestJS)가 같은 스키마로 검증한다.
 *
 * 범위는 콘텐츠(제목·테마·문체·해시태그·날짜별 일기)뿐이다.
 * 방문 관광지(record_places)는 위치정보지원센터 검토 후 별도 계약으로 추가한다.
 */

/** AI 기록 생성 설정의 "테마" (docs/11 §4) */
export const recordThemeSchema = z.enum([
  "NATURE_SCENERY",
  "HISTORY_CULTURE",
  "FOOD_EXPERIENCE",
  "REGION_COMPLETE",
]);
export type RecordTheme = z.infer<typeof recordThemeSchema>;

/** 일기 문체 (docs/11 §4) */
export const diaryStyleSchema = z.enum([
  "DOCU_NARRATION",
  "EMOTIONAL_ESSAY",
  "FRIEND_CHAT",
]);
export type DiaryStyle = z.infer<typeof diaryStyleSchema>;

/** 일기 작성 주체 — 직접 작성 / AI 작성 */
export const entrySourceSchema = z.enum(["USER", "AI"]);
export type EntrySource = z.infer<typeof entrySourceSchema>;

const titleSchema = z.string().trim().min(1).max(50);
const hashtagsSchema = z.array(z.string().trim().min(1).max(30)).max(10);

/** POST /records */
export const createRecordSchema = z.object({
  title: titleSchema,
  theme: recordThemeSchema.optional(),
  style: diaryStyleSchema.optional(),
  hashtags: hashtagsSchema.default([]),
});
export type CreateRecordInput = z.infer<typeof createRecordSchema>;

/**
 * PATCH /records/:id — 모든 필드 선택.
 * `theme`/`style` 에 null 을 보내면 설정을 해제한다 (docs/11 §3).
 */
export const updateRecordSchema = z.object({
  title: titleSchema.optional(),
  theme: recordThemeSchema.nullish(),
  style: diaryStyleSchema.nullish(),
  hashtags: hashtagsSchema.optional(),
});
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;

/** 일차 경로 파라미터 — `YYYY-MM-DD` (달력상 실재하는 날짜만 통과) */
export const entryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다")
  .refine((value) => {
    // 월/일이 범위를 벗어나면 Invalid Date 가 되고 toISOString() 이 예외를 던지므로
    // 먼저 유효성을 확인한다. 그다음 왕복 비교로 2026-02-30 같은 넘침을 걸러낸다.
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.toISOString().startsWith(value);
  }, "존재하지 않는 날짜입니다");

/** PUT /records/:id/days/:date/entry */
export const upsertEntrySchema = z.object({
  content: z.string().trim().min(1).max(5000),
  source: entrySourceSchema,
});
export type UpsertEntryInput = z.infer<typeof upsertEntrySchema>;
