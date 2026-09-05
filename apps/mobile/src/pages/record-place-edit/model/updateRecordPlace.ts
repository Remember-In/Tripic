import type {
  LocalRecordDay,
  LocalRecordDayInput,
  LocalRecordPhoto,
  LocalRecordVisit,
  LocalRecordVisitInput,
  LocalTravelRecord,
  UpdateLocalTravelRecordInput,
} from "@/entities/travel-record";
import type { TouristPlaceCandidate } from "@/entities/tourist-place";

export type RecordVisitContext = {
  day: LocalRecordDay;
  photo: LocalRecordPhoto | null;
  visit: LocalRecordVisit;
};

export function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function findRecordVisit(
  record: LocalTravelRecord,
  visitId: string,
): RecordVisitContext | null {
  for (const day of record.days) {
    const visit = day.visits.find((item) => item.id === visitId);
    if (visit) {
      return {
        day,
        photo: day.photos.find((photo) => photo.id === visit.photoId) ?? null,
        visit,
      };
    }
  }

  return null;
}

function toVisitInput(visit: LocalRecordVisit): LocalRecordVisitInput {
  return {
    areaCode: visit.areaCode,
    categoryCode: visit.categoryCode,
    contentId: visit.contentId,
    id: visit.id,
    matchConfidence: visit.matchConfidence,
    matchMethod: visit.matchMethod,
    photoId: visit.photoId,
    sigunguCode: visit.sigunguCode,
    visitedAt: visit.visitedAt,
  };
}

function toDayInput(day: LocalRecordDay): LocalRecordDayInput {
  return {
    date: day.date,
    id: day.id,
    note: day.note,
    photos: day.photos.map((photo) => ({
      id: photo.id,
      localAssetId: photo.localAssetId,
      localUri: photo.localUri,
    })),
    visits: day.visits.map(toVisitInput),
  };
}

function visitedAtForDate(visitedAt: string, date: string) {
  const time = visitedAt.match(/T.+$/)?.[0] ?? "T12:00:00.000Z";
  return `${date}${time}`;
}

function createDayId(record: LocalTravelRecord, date: string) {
  const existingIds = new Set(record.days.map((day) => day.id));
  const baseId = `${record.id}-day-${date}`;
  let candidate = baseId;
  let suffix = 2;

  while (existingIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function hasDayContent(day: LocalRecordDayInput) {
  return (
    Boolean(day.note?.trim()) || day.photos.length > 0 || day.visits.length > 0
  );
}

export function buildRecordPlaceUpdate(
  record: LocalTravelRecord,
  visitId: string,
  date: string,
  place: TouristPlaceCandidate | null,
): UpdateLocalTravelRecordInput {
  if (!isValidDateOnly(date)) {
    throw new Error("방문일은 유효한 YYYY-MM-DD 형식이어야 합니다.");
  }

  const context = findRecordVisit(record, visitId);
  if (!context) {
    throw new Error("수정할 장소 기록을 찾을 수 없습니다.");
  }
  if (context.visit.photoId && !context.photo) {
    throw new Error("장소 기록에 연결된 사진을 찾을 수 없습니다.");
  }

  const linkedVisits = context.photo
    ? context.day.visits.filter(
        (visit) =>
          visit.id !== context.visit.id && visit.photoId === context.photo?.id,
      )
    : [];
  if (linkedVisits.length > 0 && date !== context.day.date) {
    throw new Error(
      "같은 사진에 여러 장소가 연결되어 있어 방문일을 옮길 수 없습니다.",
    );
  }

  const updatedVisit: LocalRecordVisitInput = {
    ...(place
      ? {
          areaCode: place.areaCode,
          categoryCode: place.categoryCode ?? null,
          contentId: place.contentId,
          matchConfidence: place.confidence,
          matchMethod: place.matchMethod,
          sigunguCode: place.sigunguCode ?? null,
        }
      : toVisitInput(context.visit)),
    id: context.visit.id,
    photoId: context.visit.photoId,
    visitedAt: visitedAtForDate(context.visit.visitedAt, date),
  };

  let days = record.days.map(toDayInput);
  if (date === context.day.date) {
    days = days.map((day) =>
      day.id === context.day.id
        ? {
            ...day,
            visits: day.visits.map((visit) =>
              visit.id === context.visit.id ? updatedVisit : visit,
            ),
          }
        : day,
    );
  } else {
    days = days.map((day) =>
      day.id === context.day.id
        ? {
            ...day,
            photos: context.photo
              ? day.photos.filter((photo) => photo.id !== context.photo?.id)
              : day.photos,
            visits: day.visits.filter((visit) => visit.id !== context.visit.id),
          }
        : day,
    );

    const targetDay = days.find((day) => day.date === date);
    if (targetDay) {
      days = days.map((day) =>
        day.id === targetDay.id
          ? {
              ...day,
              photos: context.photo
                ? [
                    ...day.photos,
                    {
                      id: context.photo.id,
                      localAssetId: context.photo.localAssetId,
                      localUri: context.photo.localUri,
                    },
                  ]
                : day.photos,
              visits: [...day.visits, updatedVisit],
            }
          : day,
      );
    } else {
      days = [
        ...days,
        {
          date,
          id: createDayId(record, date),
          note: null,
          photos: context.photo
            ? [
                {
                  id: context.photo.id,
                  localAssetId: context.photo.localAssetId,
                  localUri: context.photo.localUri,
                },
              ]
            : [],
          visits: [updatedVisit],
        },
      ];
    }

    days = days.filter(hasDayContent);
  }

  return {
    days: [...days].sort((left, right) => left.date.localeCompare(right.date)),
    id: record.id,
    style: record.style,
    tags: record.tags,
    theme: record.theme,
    title: record.title,
  };
}
