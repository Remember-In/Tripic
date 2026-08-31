export type Notice = Readonly<{
  body: string;
  id: string;
  publishedAt: string;
  title: string;
}>;

const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseNotice(value: unknown): Notice | undefined {
  const notice = asRecord(value);

  if (
    !notice ||
    !isNonEmptyString(notice.id) ||
    !isNonEmptyString(notice.title) ||
    typeof notice.body !== "string" ||
    !isNonEmptyString(notice.publishedAt) ||
    !ISO_DATE_TIME_PATTERN.test(notice.publishedAt) ||
    !Number.isFinite(Date.parse(notice.publishedAt))
  ) {
    return undefined;
  }

  return {
    body: notice.body,
    id: notice.id,
    publishedAt: notice.publishedAt,
    title: notice.title,
  };
}

/** 비배열 응답은 빈 목록으로, 잘못된 항목은 제외해 안전하게 정규화한다. */
export function normalizeNotices(value: unknown): readonly Notice[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(parseNotice)
    .filter((notice): notice is Notice => notice !== undefined)
    .sort(
      (left, right) =>
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
    );
}
