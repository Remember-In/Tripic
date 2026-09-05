import type { TravelRecordSummary } from "./travelRecord";

export const recordThemes = [
  "NATURE_SCENERY",
  "HISTORY_CULTURE",
  "FOOD_EXPERIENCE",
  "REGION_COMPLETE",
] as const;

export const diaryStyles = [
  "DOCU_NARRATION",
  "EMOTIONAL_ESSAY",
  "FRIEND_CHAT",
] as const;

export const entrySources = ["USER", "AI"] as const;

export type RecordTheme = (typeof recordThemes)[number];
export type DiaryStyle = (typeof diaryStyles)[number];
export type EntrySource = (typeof entrySources)[number];

declare const dateOnlyBrand: unique symbol;
declare const isoDateTimeBrand: unique symbol;

/** A calendar date sent by the records API. Never convert this to `Date`. */
export type DateOnlyString = string & {
  readonly [dateOnlyBrand]: "DateOnlyString";
};

/** An absolute timestamp sent by the records API. */
export type IsoDateTimeString = string & {
  readonly [isoDateTimeBrand]: "IsoDateTimeString";
};

export type RecordSummaryDto = {
  createdAt: IsoDateTimeString;
  endDate: DateOnlyString | null;
  entryCount: number;
  hashtags: readonly string[];
  id: string;
  startDate: DateOnlyString | null;
  style: DiaryStyle | null;
  theme: RecordTheme | null;
  title: string;
  updatedAt: IsoDateTimeString;
};

export type RecordPhotoDto = {
  id: string;
  url: string;
};

export type RecordEntryDto = {
  content: string;
  createdAt: IsoDateTimeString;
  source: EntrySource;
  updatedAt: IsoDateTimeString;
};

export type RecordDayDto = {
  date: DateOnlyString;
  entry: RecordEntryDto | null;
  photos: readonly RecordPhotoDto[];
};

export type RecordDetailDto = {
  createdAt: IsoDateTimeString;
  days: readonly RecordDayDto[];
  hashtags: readonly string[];
  id: string;
  style: DiaryStyle | null;
  theme: RecordTheme | null;
  title: string;
  updatedAt: IsoDateTimeString;
};

export type CreateRecordRequestDto = {
  hashtags?: readonly string[];
  style?: DiaryStyle;
  theme?: RecordTheme;
  title: string;
};

export type UpdateRecordRequestDto = {
  hashtags?: readonly string[];
  style?: DiaryStyle | null;
  theme?: RecordTheme | null;
  title?: string;
};

export type UpsertRecordEntryRequestDto = {
  content: string;
  source: EntrySource;
};

export type GenerateRecordEntryRequestDto = {
  memo?: string;
  placeNames?: readonly string[];
};

export type GeneratedRecordEntryDto = {
  content: string;
  source: "AI";
};

export type RecordContractIssue = {
  message: string;
  path: readonly (number | string)[];
};

export class RecordContractValidationError extends Error {
  readonly issues: readonly RecordContractIssue[];

  constructor(issue: RecordContractIssue) {
    super(`${formatIssuePath(issue.path)}: ${issue.message}`);
    this.name = "RecordContractValidationError";
    this.issues = [issue];
  }
}

export type SafeParseResult<T> =
  | { data: T; success: true }
  | { error: RecordContractValidationError; success: false };

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

function formatIssuePath(path: readonly (number | string)[]): string {
  if (path.length === 0) {
    return "response";
  }

  return path.reduce<string>((result, segment) => {
    if (typeof segment === "number") {
      return `${result}[${segment}]`;
    }

    return result.length === 0 ? segment : `${result}.${segment}`;
  }, "");
}

function fail(path: readonly (number | string)[], message: string): never {
  throw new RecordContractValidationError({ message, path });
}

function parseObject(
  value: unknown,
  path: readonly (number | string)[],
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "객체여야 합니다.");
  }

  return value as Readonly<Record<string, unknown>>;
}

function parseString(
  value: unknown,
  path: readonly (number | string)[],
  { maxLength, minLength = 1 }: { maxLength?: number; minLength?: number } = {},
): string {
  if (typeof value !== "string") {
    return fail(path, "문자열이어야 합니다.");
  }

  if (value.length < minLength) {
    return fail(path, `최소 ${minLength}자여야 합니다.`);
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return fail(path, `최대 ${maxLength}자여야 합니다.`);
  }

  if (value !== value.trim()) {
    return fail(path, "앞뒤 공백이 없어야 합니다.");
  }

  return value;
}

function parseEnum<const T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  path: readonly (number | string)[],
): T[number] {
  if (typeof value !== "string" || !allowedValues.includes(value)) {
    return fail(path, `허용된 값(${allowedValues.join(", ")})이어야 합니다.`);
  }

  return value as T[number];
}

function parseNullableEnum<const T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  path: readonly (number | string)[],
): T[number] | null {
  return value === null ? null : parseEnum(value, allowedValues, path);
}

function parseStringArray(
  value: unknown,
  path: readonly (number | string)[],
  { itemMaxLength, maxLength }: { itemMaxLength: number; maxLength: number },
): readonly string[] {
  if (!Array.isArray(value)) {
    return fail(path, "배열이어야 합니다.");
  }

  if (value.length > maxLength) {
    return fail(path, `최대 ${maxLength}개까지 허용됩니다.`);
  }

  return value.map((item, index) =>
    parseString(item, [...path, index], { maxLength: itemMaxLength }),
  );
}

function parseDateOnly(
  value: unknown,
  path: readonly (number | string)[],
): DateOnlyString {
  if (typeof value !== "string" || !isDateOnlyString(value)) {
    return fail(path, "유효한 YYYY-MM-DD 날짜여야 합니다.");
  }

  return value;
}

function parseNullableDateOnly(
  value: unknown,
  path: readonly (number | string)[],
): DateOnlyString | null {
  return value === null ? null : parseDateOnly(value, path);
}

function parseIsoDateTime(
  value: unknown,
  path: readonly (number | string)[],
): IsoDateTimeString {
  if (
    typeof value !== "string" ||
    !isoDateTimePattern.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    return fail(path, "유효한 UTC ISO 8601 시각이어야 합니다.");
  }

  return value as IsoDateTimeString;
}

function parseRecordBase(
  value: Readonly<Record<string, unknown>>,
  path: readonly (number | string)[],
) {
  return {
    createdAt: parseIsoDateTime(value.createdAt, [...path, "createdAt"]),
    hashtags: parseStringArray(value.hashtags, [...path, "hashtags"], {
      itemMaxLength: 30,
      maxLength: 10,
    }),
    id: parseString(value.id, [...path, "id"]),
    style: parseNullableEnum(value.style, diaryStyles, [...path, "style"]),
    theme: parseNullableEnum(value.theme, recordThemes, [...path, "theme"]),
    title: parseString(value.title, [...path, "title"], { maxLength: 50 }),
    updatedAt: parseIsoDateTime(value.updatedAt, [...path, "updatedAt"]),
  };
}

export function parseRecordPhotoDto(
  value: unknown,
  path: readonly (number | string)[] = [],
): RecordPhotoDto {
  const object = parseObject(value, path);

  return {
    id: parseString(object.id, [...path, "id"]),
    url: parseString(object.url, [...path, "url"]),
  };
}

export function parseRecordEntryDto(
  value: unknown,
  path: readonly (number | string)[] = [],
): RecordEntryDto {
  const object = parseObject(value, path);

  return {
    content: parseString(object.content, [...path, "content"], {
      maxLength: 5_000,
    }),
    createdAt: parseIsoDateTime(object.createdAt, [...path, "createdAt"]),
    source: parseEnum(object.source, entrySources, [...path, "source"]),
    updatedAt: parseIsoDateTime(object.updatedAt, [...path, "updatedAt"]),
  };
}

function parseRecordDay(
  value: unknown,
  path: readonly (number | string)[],
): RecordDayDto {
  const object = parseObject(value, path);

  if (!Array.isArray(object.photos)) {
    return fail([...path, "photos"], "배열이어야 합니다.");
  }

  return {
    date: parseDateOnly(object.date, [...path, "date"]),
    entry:
      object.entry === null
        ? null
        : parseRecordEntryDto(object.entry, [...path, "entry"]),
    photos: object.photos.map((photo, index) =>
      parseRecordPhotoDto(photo, [...path, "photos", index]),
    ),
  };
}

function safeParse<T>(
  parser: (value: unknown) => T,
  value: unknown,
): SafeParseResult<T> {
  try {
    return { data: parser(value), success: true };
  } catch (error) {
    if (error instanceof RecordContractValidationError) {
      return { error, success: false };
    }

    throw error;
  }
}

export function isDateOnlyString(value: string): value is DateOnlyString {
  const match = dateOnlyPattern.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day <= (daysInMonth[month - 1] ?? 0);
}

export function toDateOnlyString(value: string): DateOnlyString {
  return parseDateOnly(value, []);
}

export function compareDateOnlyStrings(
  left: DateOnlyString,
  right: DateOnlyString,
): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function formatDateOnlyForDisplay(value: DateOnlyString): string {
  return value.replaceAll("-", ".");
}

export function formatDateOnlyRange(
  startDate: DateOnlyString | null,
  endDate: DateOnlyString | null,
): string {
  if (startDate === null || endDate === null) {
    return "";
  }

  if (startDate === endDate) {
    return formatDateOnlyForDisplay(startDate);
  }

  const [startYear, startMonth, startDay] = startDate.split("-");
  const [endYear, endMonth, endDay] = endDate.split("-");
  if (startYear === endYear && startMonth === endMonth) {
    return `${startYear}.${startMonth}.${startDay}-${endDay}`;
  }

  if (startYear === endYear) {
    return `${startYear}.${startMonth}.${startDay}-${endMonth}.${endDay}`;
  }

  return `${formatDateOnlyForDisplay(startDate)}-${formatDateOnlyForDisplay(endDate)}`;
}

export function parseRecordSummaryDto(value: unknown): RecordSummaryDto {
  const object = parseObject(value, []);
  const base = parseRecordBase(object, []);
  const entryCount = object.entryCount;
  if (
    typeof entryCount !== "number" ||
    !Number.isInteger(entryCount) ||
    entryCount < 0
  ) {
    return fail(["entryCount"], "0 이상의 정수여야 합니다.");
  }

  const startDate = parseNullableDateOnly(object.startDate, ["startDate"]);
  const endDate = parseNullableDateOnly(object.endDate, ["endDate"]);
  if ((startDate === null) !== (endDate === null)) {
    return fail(
      ["startDate", "endDate"],
      "두 날짜는 함께 null이거나 함께 설정되어야 합니다.",
    );
  }

  if (
    startDate !== null &&
    endDate !== null &&
    compareDateOnlyStrings(startDate, endDate) > 0
  ) {
    return fail(["startDate", "endDate"], "시작일이 종료일보다 늦습니다.");
  }

  return { ...base, endDate, entryCount, startDate };
}

export function safeParseRecordSummaryDto(
  value: unknown,
): SafeParseResult<RecordSummaryDto> {
  return safeParse(parseRecordSummaryDto, value);
}

export function parseRecordSummaryListDto(
  value: unknown,
): readonly RecordSummaryDto[] {
  if (!Array.isArray(value)) {
    return fail([], "배열이어야 합니다.");
  }

  return value.map((item, index) => {
    try {
      return parseRecordSummaryDto(item);
    } catch (error) {
      if (error instanceof RecordContractValidationError) {
        const issue = error.issues[0];
        if (issue) {
          return fail([index, ...issue.path], issue.message);
        }
      }

      throw error;
    }
  });
}

export function safeParseRecordSummaryListDto(
  value: unknown,
): SafeParseResult<readonly RecordSummaryDto[]> {
  return safeParse(parseRecordSummaryListDto, value);
}

export function parseRecordDetailDto(value: unknown): RecordDetailDto {
  const object = parseObject(value, []);
  const base = parseRecordBase(object, []);
  if (!Array.isArray(object.days)) {
    return fail(["days"], "배열이어야 합니다.");
  }

  const days = object.days.map((day, index) =>
    parseRecordDay(day, ["days", index]),
  );
  for (let index = 1; index < days.length; index += 1) {
    const previousDay = days[index - 1];
    const currentDay = days[index];
    if (
      previousDay &&
      currentDay &&
      compareDateOnlyStrings(previousDay.date, currentDay.date) >= 0
    ) {
      return fail(
        ["days", index, "date"],
        "날짜는 중복 없이 오름차순이어야 합니다.",
      );
    }
  }

  return { ...base, days };
}

export function safeParseRecordDetailDto(
  value: unknown,
): SafeParseResult<RecordDetailDto> {
  return safeParse(parseRecordDetailDto, value);
}

export function safeParseRecordEntryDto(
  value: unknown,
): SafeParseResult<RecordEntryDto> {
  return safeParse((entry) => parseRecordEntryDto(entry, []), value);
}

export function safeParseRecordPhotoDto(
  value: unknown,
): SafeParseResult<RecordPhotoDto> {
  return safeParse((photo) => parseRecordPhotoDto(photo, []), value);
}

export function parseGeneratedRecordEntryDto(
  value: unknown,
): GeneratedRecordEntryDto {
  const object = parseObject(value, []);
  const source = parseEnum(object.source, entrySources, ["source"]);
  if (source !== "AI") {
    return fail(["source"], "AI여야 합니다.");
  }

  return {
    content: parseString(object.content, ["content"], { maxLength: 5_000 }),
    source,
  };
}

export function safeParseGeneratedRecordEntryDto(
  value: unknown,
): SafeParseResult<GeneratedRecordEntryDto> {
  return safeParse(parseGeneratedRecordEntryDto, value);
}

/**
 * Converts only content fields exposed by the records API. `regions` and place
 * data intentionally stay absent until the Phase 3 record-places contract exists.
 */
export function mapRecordSummaryDtoToTravelRecordSummary(
  summary: RecordSummaryDto,
): TravelRecordSummary {
  return {
    dateRange: formatDateOnlyRange(summary.startDate, summary.endDate),
    id: summary.id,
    title: summary.title,
  };
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
