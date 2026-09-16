import type { MatchConfidence, MatchMethod } from "@tripic/shared";

import { openTripicDatabase, type TripicDatabase } from "@/shared/lib/storage";

import type { DiaryStyle, RecordTheme } from "../model/recordContract";
import {
  GUEST_LOCAL_RECORD_OWNER_KEY,
  type CreateLocalTravelRecordInput,
  type LocalRecordDay,
  type LocalRecordOwnerKey,
  type LocalRecordPhoto,
  type LocalRecordPhotoInput,
  type LocalRecordStats,
  type LocalRecordVisit,
  type LocalRecordVisitInput,
  type LocalRegionProgress,
  type LocalRegionProgressScope,
  type LocalTravelRecord,
  type LocalTravelRecordSummary,
  type UpdateLocalTravelRecordInput,
} from "../model/localRecord";

type DatabaseProvider = () => Promise<TripicDatabase>;

type RecordRow = {
  created_at: string;
  id: string;
  owner_key: string;
  style: string | null;
  theme: string | null;
  title: string;
  updated_at: string;
};

type RecordSummaryRow = RecordRow & {
  cover_photo_uri: string | null;
  day_count: number;
  end_date: string | null;
  photo_count: number;
  start_date: string | null;
  visit_count: number;
};

type TagRow = {
  record_id: string;
  tag: string;
};

type AreaRow = {
  area_code: string;
  record_id: string;
};

type DayRow = {
  id: string;
  note: string | null;
  visit_date: string;
};

type PhotoRow = {
  day_id: string;
  id: string;
  local_asset_id: string | null;
  local_uri: string | null;
};

type VisitRow = {
  area_code: string;
  category_code: string | null;
  content_id: string;
  created_at: string;
  day_id: string;
  id: string;
  match_confidence: string;
  match_method: string;
  photo_id: string | null;
  sigungu_code: string | null;
  updated_at: string;
  visited_at: string;
};

type RegionProgressRow = {
  area_code: string;
  first_visited_at: string;
  last_visited_at: string;
  sigungu_code: string | null;
  visit_count: number;
};

type RecordStatsRow = {
  photo_count: number;
  record_count: number;
  visited_area_count: number;
  visited_place_count: number;
  visited_sigungu_count: number;
};

type PhotoCleanupRow = {
  local_uri: string;
};

type NormalizedPhotoInput = {
  id: string;
  localAssetId: string | null;
  localUri: string | null;
};

type NormalizedVisitInput = Omit<
  LocalRecordVisitInput,
  "categoryCode" | "photoId" | "sigunguCode" | "visitedAt"
> & {
  categoryCode: string | null;
  photoId: string | null;
  sigunguCode: string | null;
  visitedAt: string;
};

type NormalizedDayInput = {
  date: string;
  id: string;
  note: string | null;
  photos: readonly NormalizedPhotoInput[];
  visits: readonly NormalizedVisitInput[];
};

type NormalizedRecordInput = {
  days: readonly NormalizedDayInput[];
  id: string;
  style: DiaryStyle | null;
  tags: readonly string[];
  theme: RecordTheme | null;
  title: string;
};

export interface LocalTravelRecordRepository {
  clearRecords(ownerKey: LocalRecordOwnerKey): Promise<number>;
  completePhotoCleanup(
    ownerKey: LocalRecordOwnerKey,
    localUris: readonly string[],
  ): Promise<void>;
  createRecord(input: CreateLocalTravelRecordInput): Promise<LocalTravelRecord>;
  deleteRecord(
    ownerKey: LocalRecordOwnerKey,
    recordId: string,
  ): Promise<boolean>;
  getRecord(
    ownerKey: LocalRecordOwnerKey,
    recordId: string,
  ): Promise<LocalTravelRecord | null>;
  getRegionProgress(
    ownerKey: LocalRecordOwnerKey,
    scope?: LocalRegionProgressScope,
  ): Promise<readonly LocalRegionProgress[]>;
  getStats(ownerKey: LocalRecordOwnerKey): Promise<LocalRecordStats>;
  listRecords(
    ownerKey: LocalRecordOwnerKey,
  ): Promise<readonly LocalTravelRecordSummary[]>;
  listPendingPhotoCleanup(
    ownerKey: LocalRecordOwnerKey,
  ): Promise<readonly string[]>;
  listPhotoCleanupOwnerKeys(): Promise<readonly LocalRecordOwnerKey[]>;
  stagePhotoCleanup(
    ownerKey: LocalRecordOwnerKey,
    localUris: readonly string[],
  ): Promise<void>;
  updateRecord(
    ownerKey: LocalRecordOwnerKey,
    input: UpdateLocalTravelRecordInput,
  ): Promise<LocalTravelRecord>;
}

export class LocalRecordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalRecordValidationError";
  }
}

export class LocalRecordNotFoundError extends Error {
  readonly recordId: string;

  constructor(recordId: string) {
    super(`로컬 여행 기록을 찾을 수 없습니다: ${recordId}`);
    this.name = "LocalRecordNotFoundError";
    this.recordId = recordId;
  }
}

function requireText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new LocalRecordValidationError(
      `${fieldName}은(는) 비어 있을 수 없습니다.`,
    );
  }

  return normalizedValue;
}

function optionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length === 0 ? null : normalizedValue;
}

function assertOwnerKey(ownerKey: LocalRecordOwnerKey): void {
  if (
    ownerKey !== GUEST_LOCAL_RECORD_OWNER_KEY &&
    (!ownerKey.startsWith("user:") || ownerKey.length <= "user:".length)
  ) {
    throw new LocalRecordValidationError(
      "ownerKey는 guest 또는 user:{사용자 ID} 형식이어야 합니다.",
    );
  }
}

function normalizeDateOnly(value: string, fieldName: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new LocalRecordValidationError(
      `${fieldName}은(는) YYYY-MM-DD 형식이어야 합니다.`,
    );
  }

  const normalizedDate = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(normalizedDate.getTime()) ||
    normalizedDate.toISOString().slice(0, 10) !== value
  ) {
    throw new LocalRecordValidationError(
      `${fieldName}이(가) 유효하지 않습니다.`,
    );
  }

  return value;
}

function normalizeIsoDateTime(value: string, fieldName: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new LocalRecordValidationError(
      `${fieldName}은(는) 유효한 ISO 8601 시각이어야 합니다.`,
    );
  }

  return date.toISOString();
}

function normalizePhoto(
  photo: LocalRecordPhotoInput,
  photoIndex: number,
): NormalizedPhotoInput {
  const localAssetId = optionalText(photo.localAssetId);
  const localUri = optionalText(photo.localUri);

  if (!localAssetId && !localUri) {
    throw new LocalRecordValidationError(
      `days.photos[${photoIndex}]에는 localAssetId 또는 localUri가 필요합니다.`,
    );
  }

  if (localUri && /^https?:\/\//i.test(localUri)) {
    throw new LocalRecordValidationError(
      `days.photos[${photoIndex}].localUri에는 원격 URL을 저장할 수 없습니다.`,
    );
  }

  return {
    id: requireText(photo.id, `days.photos[${photoIndex}].id`),
    localAssetId,
    localUri,
  };
}

function normalizeVisit(
  visit: LocalRecordVisitInput,
  visitIndex: number,
  dayDate: string,
  photoIds: ReadonlySet<string>,
): NormalizedVisitInput {
  const photoId = optionalText(visit.photoId);

  if (photoId && !photoIds.has(photoId)) {
    throw new LocalRecordValidationError(
      `days.visits[${visitIndex}].photoId가 같은 날짜의 사진을 가리키지 않습니다.`,
    );
  }

  return {
    areaCode: requireText(
      visit.areaCode,
      `days.visits[${visitIndex}].areaCode`,
    ),
    categoryCode: optionalText(visit.categoryCode),
    contentId: requireText(
      visit.contentId,
      `days.visits[${visitIndex}].contentId`,
    ),
    id: requireText(visit.id, `days.visits[${visitIndex}].id`),
    matchConfidence: visit.matchConfidence,
    matchMethod: visit.matchMethod,
    photoId,
    sigunguCode: optionalText(visit.sigunguCode),
    visitedAt: normalizeIsoDateTime(
      visit.visitedAt ?? `${dayDate}T00:00:00.000Z`,
      `days.visits[${visitIndex}].visitedAt`,
    ),
  };
}

function assertUniqueIds(ids: readonly string[], fieldName: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new LocalRecordValidationError(`${fieldName}에 중복 ID가 있습니다.`);
  }
}

function normalizeRecordInput(
  input: Omit<CreateLocalTravelRecordInput, "ownerKey">,
): NormalizedRecordInput {
  if (input.days.length === 0) {
    throw new LocalRecordValidationError(
      "여행 기록에는 최소 하루가 필요합니다.",
    );
  }

  const days = input.days.map((day, dayIndex) => {
    const date = normalizeDateOnly(day.date, `days[${dayIndex}].date`);
    const photos = day.photos.map(normalizePhoto);
    const photoIds = new Set(photos.map((photo) => photo.id));
    const visits = day.visits.map((visit, visitIndex) =>
      normalizeVisit(visit, visitIndex, date, photoIds),
    );

    assertUniqueIds(
      photos.map((photo) => photo.id),
      `days[${dayIndex}].photos`,
    );
    assertUniqueIds(
      visits.map((visit) => visit.id),
      `days[${dayIndex}].visits`,
    );

    return {
      date,
      id: requireText(day.id, `days[${dayIndex}].id`),
      note: optionalText(day.note),
      photos,
      visits,
    };
  });

  assertUniqueIds(
    days.map((day) => day.id),
    "days",
  );
  assertUniqueIds(
    days.map((day) => day.date),
    "days.date",
  );
  assertUniqueIds(
    days.flatMap((day) => day.photos.map((photo) => photo.id)),
    "days.photos",
  );
  assertUniqueIds(
    days.flatMap((day) => day.visits.map((visit) => visit.id)),
    "days.visits",
  );

  const tags = (input.tags ?? []).map((tag, tagIndex) =>
    requireText(tag, `tags[${tagIndex}]`),
  );

  if (new Set(tags).size !== tags.length) {
    throw new LocalRecordValidationError("tags에 중복 값이 있습니다.");
  }

  return {
    days,
    id: requireText(input.id, "id"),
    style: input.style ?? null,
    tags,
    theme: input.theme ?? null,
    title: requireText(input.title, "title"),
  };
}

function mapRecordRow(
  row: RecordRow,
  days: readonly LocalRecordDay[],
  tags: readonly string[],
): LocalTravelRecord {
  return {
    createdAt: row.created_at,
    days,
    id: row.id,
    ownerKey: row.owner_key as LocalRecordOwnerKey,
    style: row.style as DiaryStyle | null,
    tags,
    theme: row.theme as RecordTheme | null,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function mapNewRecord(
  record: NormalizedRecordInput,
  ownerKey: LocalRecordOwnerKey,
  timestamp: string,
): LocalTravelRecord {
  return {
    createdAt: timestamp,
    days: record.days.map((day) => ({
      date: day.date,
      id: day.id,
      note: day.note,
      photos: day.photos.map((photo) => ({
        id: photo.id,
        localAssetId: photo.localAssetId,
        localUri: photo.localUri,
      })),
      visits: day.visits.map((visit) => ({
        ...visit,
        createdAt: timestamp,
        updatedAt: timestamp,
        userConfirmed: true,
      })),
    })),
    id: record.id,
    ownerKey,
    style: record.style,
    tags: record.tags,
    theme: record.theme,
    title: record.title,
    updatedAt: timestamp,
  };
}

async function insertRecordChildren(
  database: TripicDatabase,
  record: NormalizedRecordInput,
  timestamp: string,
  createdAtByVisitId: ReadonlyMap<string, string> = new Map(),
): Promise<void> {
  for (const [tagIndex, tag] of record.tags.entries()) {
    await database.runAsync(
      `INSERT INTO local_record_tags (record_id, tag, sort_order)
       VALUES (?, ?, ?);`,
      record.id,
      tag,
      tagIndex,
    );
  }

  for (const [dayIndex, day] of record.days.entries()) {
    await database.runAsync(
      `INSERT INTO local_record_days
         (id, record_id, visit_date, day_index, note)
       VALUES (?, ?, ?, ?, ?);`,
      day.id,
      record.id,
      day.date,
      dayIndex,
      day.note,
    );

    for (const [photoIndex, photo] of day.photos.entries()) {
      await database.runAsync(
        `INSERT INTO local_record_photos
           (id, day_id, local_asset_id, local_uri, sort_order)
         VALUES (?, ?, ?, ?, ?);`,
        photo.id,
        day.id,
        photo.localAssetId,
        photo.localUri,
        photoIndex,
      );
    }

    for (const [visitIndex, visit] of day.visits.entries()) {
      await database.runAsync(
        `INSERT INTO local_record_visits
           (id, day_id, photo_id, content_id, visited_at, area_code,
            sigungu_code, category_code, match_method, match_confidence,
            user_confirmed, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?);`,
        visit.id,
        day.id,
        visit.photoId,
        visit.contentId,
        visit.visitedAt,
        visit.areaCode,
        visit.sigunguCode,
        visit.categoryCode,
        visit.matchMethod,
        visit.matchConfidence,
        visitIndex,
        createdAtByVisitId.get(visit.id) ?? timestamp,
        timestamp,
      );
    }
  }
}

async function queuePhotoCleanup(
  database: TripicDatabase,
  ownerKey: LocalRecordOwnerKey,
  localUris: readonly string[],
  timestamp: string,
) {
  for (const localUri of new Set(localUris.filter(Boolean))) {
    await database.runAsync(
      `INSERT INTO local_photo_cleanup_queue
         (local_uri, owner_key, queued_at)
       VALUES (?, ?, ?)
       ON CONFLICT(local_uri) DO UPDATE SET
         owner_key = excluded.owner_key,
         queued_at = excluded.queued_at;`,
      localUri,
      ownerKey,
      timestamp,
    );
  }
}

async function cancelPhotoCleanup(
  database: TripicDatabase,
  localUris: readonly string[],
) {
  for (const localUri of new Set(localUris.filter(Boolean))) {
    await database.runAsync(
      "DELETE FROM local_photo_cleanup_queue WHERE local_uri = ?;",
      localUri,
    );
  }
}

async function readRecord(
  database: TripicDatabase,
  ownerKey: LocalRecordOwnerKey,
  recordId: string,
): Promise<LocalTravelRecord | null> {
  const row = await database.getFirstAsync<RecordRow>(
    `SELECT id, owner_key, title, theme, style, created_at, updated_at
     FROM local_records
     WHERE id = ? AND owner_key = ?;`,
    recordId,
    ownerKey,
  );

  if (!row) {
    return null;
  }

  const [dayRows, photoRows, visitRows, tagRows] = await Promise.all([
    database.getAllAsync<DayRow>(
      `SELECT id, visit_date, note
       FROM local_record_days
       WHERE record_id = ?
       ORDER BY day_index ASC;`,
      recordId,
    ),
    database.getAllAsync<PhotoRow>(
      `SELECT photo.id, photo.day_id, photo.local_asset_id, photo.local_uri
       FROM local_record_photos AS photo
       INNER JOIN local_record_days AS day ON day.id = photo.day_id
       WHERE day.record_id = ?
       ORDER BY day.day_index ASC, photo.sort_order ASC;`,
      recordId,
    ),
    database.getAllAsync<VisitRow>(
      `SELECT visit.id, visit.day_id, visit.photo_id, visit.content_id,
              visit.visited_at, visit.area_code, visit.sigungu_code,
              visit.category_code, visit.match_method,
              visit.match_confidence, visit.created_at, visit.updated_at
       FROM local_record_visits AS visit
       INNER JOIN local_record_days AS day ON day.id = visit.day_id
       WHERE day.record_id = ? AND visit.user_confirmed = 1
       ORDER BY day.day_index ASC, visit.sort_order ASC;`,
      recordId,
    ),
    database.getAllAsync<TagRow>(
      `SELECT record_id, tag
       FROM local_record_tags
       WHERE record_id = ?
       ORDER BY sort_order ASC;`,
      recordId,
    ),
  ]);

  const photosByDay = new Map<string, LocalRecordPhoto[]>();
  for (const photo of photoRows) {
    const photos = photosByDay.get(photo.day_id) ?? [];
    photos.push({
      id: photo.id,
      localAssetId: photo.local_asset_id,
      localUri: photo.local_uri,
    });
    photosByDay.set(photo.day_id, photos);
  }

  const visitsByDay = new Map<string, LocalRecordVisit[]>();
  for (const visit of visitRows) {
    const visits = visitsByDay.get(visit.day_id) ?? [];
    visits.push({
      areaCode: visit.area_code,
      categoryCode: visit.category_code,
      contentId: visit.content_id,
      createdAt: visit.created_at,
      id: visit.id,
      matchConfidence: visit.match_confidence as MatchConfidence,
      matchMethod: visit.match_method as MatchMethod,
      photoId: visit.photo_id,
      sigunguCode: visit.sigungu_code,
      updatedAt: visit.updated_at,
      userConfirmed: true,
      visitedAt: visit.visited_at,
    });
    visitsByDay.set(visit.day_id, visits);
  }

  const days = dayRows.map<LocalRecordDay>((day) => ({
    date: day.visit_date,
    id: day.id,
    note: day.note,
    photos: photosByDay.get(day.id) ?? [],
    visits: visitsByDay.get(day.id) ?? [],
  }));

  return mapRecordRow(
    row,
    days,
    tagRows.map((tag) => tag.tag),
  );
}

export class SqliteLocalTravelRecordRepository implements LocalTravelRecordRepository {
  private operationTail: Promise<void> = Promise.resolve();

  constructor(
    private readonly provideDatabase: DatabaseProvider = openTripicDatabase,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const pending = this.operationTail.then(operation, operation);
    this.operationTail = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  createRecord(
    input: CreateLocalTravelRecordInput,
  ): Promise<LocalTravelRecord> {
    return this.enqueue(async () => {
      assertOwnerKey(input.ownerKey);
      const record = normalizeRecordInput(input);
      const timestamp = normalizeIsoDateTime(this.now(), "현재 시각");
      const database = await this.provideDatabase();

      await database.withTransactionAsync(async () => {
        await database.runAsync(
          `INSERT INTO local_records
             (id, owner_key, title, theme, style, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          record.id,
          input.ownerKey,
          record.title,
          record.theme,
          record.style,
          timestamp,
          timestamp,
        );
        await insertRecordChildren(database, record, timestamp);
        await cancelPhotoCleanup(
          database,
          record.days.flatMap((day) =>
            day.photos.flatMap((photo) =>
              photo.localUri ? [photo.localUri] : [],
            ),
          ),
        );
      });

      return mapNewRecord(record, input.ownerKey, timestamp);
    });
  }

  updateRecord(
    ownerKey: LocalRecordOwnerKey,
    input: UpdateLocalTravelRecordInput,
  ): Promise<LocalTravelRecord> {
    return this.enqueue(async () => {
      assertOwnerKey(ownerKey);
      const record = normalizeRecordInput(input);
      const timestamp = normalizeIsoDateTime(this.now(), "현재 시각");
      const database = await this.provideDatabase();
      let updatedRecord: LocalTravelRecord | null = null;

      await database.withTransactionAsync(async () => {
        const result = await database.runAsync(
          `UPDATE local_records
           SET title = ?, theme = ?, style = ?, updated_at = ?
           WHERE id = ? AND owner_key = ?;`,
          record.title,
          record.theme,
          record.style,
          timestamp,
          record.id,
          ownerKey,
        );

        if (result.changes === 0) {
          throw new LocalRecordNotFoundError(record.id);
        }

        const previousVisits = await database.getAllAsync<{
          created_at: string;
          id: string;
        }>(
          `SELECT visit.id, visit.created_at
           FROM local_record_visits AS visit
           INNER JOIN local_record_days AS day ON day.id = visit.day_id
           WHERE day.record_id = ?;`,
          record.id,
        );
        const createdAtByVisitId = new Map(
          previousVisits.map((visit) => [visit.id, visit.created_at]),
        );
        const previousPhotos = await database.getAllAsync<PhotoCleanupRow>(
          `SELECT photo.local_uri
           FROM local_record_photos AS photo
           INNER JOIN local_record_days AS day ON day.id = photo.day_id
           INNER JOIN local_records AS existing_record
             ON existing_record.id = day.record_id
           WHERE existing_record.id = ? AND existing_record.owner_key = ?
             AND photo.local_uri IS NOT NULL;`,
          record.id,
          ownerKey,
        );
        const retainedLocalUris = new Set(
          record.days.flatMap((day) =>
            day.photos.flatMap((photo) =>
              photo.localUri ? [photo.localUri] : [],
            ),
          ),
        );
        await queuePhotoCleanup(
          database,
          ownerKey,
          previousPhotos
            .map((photo) => photo.local_uri)
            .filter((localUri) => !retainedLocalUris.has(localUri)),
          timestamp,
        );

        await database.runAsync(
          "DELETE FROM local_record_tags WHERE record_id = ?;",
          record.id,
        );
        await database.runAsync(
          "DELETE FROM local_record_days WHERE record_id = ?;",
          record.id,
        );
        await insertRecordChildren(
          database,
          record,
          timestamp,
          createdAtByVisitId,
        );

        updatedRecord = await readRecord(database, ownerKey, record.id);
        if (!updatedRecord) {
          throw new LocalRecordNotFoundError(record.id);
        }
      });

      if (!updatedRecord) {
        throw new LocalRecordNotFoundError(record.id);
      }

      return updatedRecord;
    });
  }

  getRecord(
    ownerKey: LocalRecordOwnerKey,
    recordId: string,
  ): Promise<LocalTravelRecord | null> {
    return this.enqueue(async () => {
      assertOwnerKey(ownerKey);
      const normalizedRecordId = requireText(recordId, "recordId");
      const database = await this.provideDatabase();
      return readRecord(database, ownerKey, normalizedRecordId);
    });
  }

  listRecords(
    ownerKey: LocalRecordOwnerKey,
  ): Promise<readonly LocalTravelRecordSummary[]> {
    return this.enqueue(async () => {
      assertOwnerKey(ownerKey);
      const database = await this.provideDatabase();
      const [recordRows, tagRows, areaRows] = await Promise.all([
        database.getAllAsync<RecordSummaryRow>(
          `SELECT record.id, record.owner_key, record.title, record.theme,
                  record.style, record.created_at, record.updated_at,
                  (SELECT COUNT(*) FROM local_record_days AS day
                   WHERE day.record_id = record.id) AS day_count,
                  (SELECT MIN(day.visit_date) FROM local_record_days AS day
                   WHERE day.record_id = record.id) AS start_date,
                  (SELECT MAX(day.visit_date) FROM local_record_days AS day
                   WHERE day.record_id = record.id) AS end_date,
                  (SELECT photo.local_uri
                   FROM local_record_photos AS photo
                   INNER JOIN local_record_days AS day ON day.id = photo.day_id
                   WHERE day.record_id = record.id
                     AND photo.local_uri IS NOT NULL
                   ORDER BY day.day_index ASC, photo.sort_order ASC
                   LIMIT 1) AS cover_photo_uri,
                  (SELECT COUNT(*)
                   FROM local_record_photos AS photo
                   INNER JOIN local_record_days AS day ON day.id = photo.day_id
                   WHERE day.record_id = record.id) AS photo_count,
                  (SELECT COUNT(*)
                   FROM local_record_visits AS visit
                   INNER JOIN local_record_days AS day ON day.id = visit.day_id
                   WHERE day.record_id = record.id
                     AND visit.user_confirmed = 1) AS visit_count
           FROM local_records AS record
           WHERE record.owner_key = ?
           ORDER BY COALESCE(end_date, record.created_at) DESC,
                    record.created_at DESC,
                    record.id DESC;`,
          ownerKey,
        ),
        database.getAllAsync<TagRow>(
          `SELECT tag.record_id, tag.tag
           FROM local_record_tags AS tag
           INNER JOIN local_records AS record ON record.id = tag.record_id
           WHERE record.owner_key = ?
           ORDER BY tag.record_id ASC, tag.sort_order ASC;`,
          ownerKey,
        ),
        database.getAllAsync<AreaRow>(
          `SELECT DISTINCT day.record_id, visit.area_code
           FROM local_record_visits AS visit
           INNER JOIN local_record_days AS day ON day.id = visit.day_id
           INNER JOIN local_records AS record ON record.id = day.record_id
           WHERE record.owner_key = ? AND visit.user_confirmed = 1
           ORDER BY day.record_id ASC, visit.area_code ASC;`,
          ownerKey,
        ),
      ]);

      const tagsByRecord = new Map<string, string[]>();
      for (const tagRow of tagRows) {
        const tags = tagsByRecord.get(tagRow.record_id) ?? [];
        tags.push(tagRow.tag);
        tagsByRecord.set(tagRow.record_id, tags);
      }

      const areaCodesByRecord = new Map<string, string[]>();
      for (const areaRow of areaRows) {
        const areaCodes = areaCodesByRecord.get(areaRow.record_id) ?? [];
        areaCodes.push(areaRow.area_code);
        areaCodesByRecord.set(areaRow.record_id, areaCodes);
      }

      return recordRows.map((row) => ({
        areaCodes: areaCodesByRecord.get(row.id) ?? [],
        coverPhotoUri: row.cover_photo_uri,
        createdAt: row.created_at,
        dayCount: row.day_count,
        endDate: row.end_date,
        id: row.id,
        ownerKey: row.owner_key as LocalRecordOwnerKey,
        photoCount: row.photo_count,
        startDate: row.start_date,
        style: row.style as DiaryStyle | null,
        tags: tagsByRecord.get(row.id) ?? [],
        theme: row.theme as RecordTheme | null,
        title: row.title,
        updatedAt: row.updated_at,
        visitCount: row.visit_count,
      }));
    });
  }

  listPendingPhotoCleanup(
    ownerKey: LocalRecordOwnerKey,
  ): Promise<readonly string[]> {
    return this.enqueue(async () => {
      assertOwnerKey(ownerKey);
      const database = await this.provideDatabase();
      const rows = await database.getAllAsync<PhotoCleanupRow>(
        `SELECT cleanup.local_uri
         FROM local_photo_cleanup_queue AS cleanup
         WHERE cleanup.owner_key = ?
           AND NOT EXISTS (
             SELECT 1
             FROM local_record_photos AS photo
             WHERE photo.local_uri = cleanup.local_uri
           )
         ORDER BY cleanup.queued_at ASC;`,
        ownerKey,
      );
      return rows.map((row) => row.local_uri);
    });
  }

  listPhotoCleanupOwnerKeys(): Promise<readonly LocalRecordOwnerKey[]> {
    return this.enqueue(async () => {
      const database = await this.provideDatabase();
      const rows = await database.getAllAsync<{ owner_key: string }>(
        `SELECT DISTINCT cleanup.owner_key
         FROM local_photo_cleanup_queue AS cleanup
         ORDER BY cleanup.owner_key ASC;`,
      );

      return rows.map((row) => {
        const ownerKey = row.owner_key as LocalRecordOwnerKey;
        assertOwnerKey(ownerKey);
        return ownerKey;
      });
    });
  }

  completePhotoCleanup(
    ownerKey: LocalRecordOwnerKey,
    localUris: readonly string[],
  ): Promise<void> {
    return this.enqueue(async () => {
      assertOwnerKey(ownerKey);
      if (localUris.length === 0) {
        return;
      }
      const database = await this.provideDatabase();
      await database.withTransactionAsync(async () => {
        for (const localUri of new Set(localUris)) {
          await database.runAsync(
            `DELETE FROM local_photo_cleanup_queue
             WHERE owner_key = ? AND local_uri = ?;`,
            ownerKey,
            localUri,
          );
        }
      });
    });
  }

  stagePhotoCleanup(
    ownerKey: LocalRecordOwnerKey,
    localUris: readonly string[],
  ): Promise<void> {
    return this.enqueue(async () => {
      assertOwnerKey(ownerKey);
      const database = await this.provideDatabase();
      const timestamp = normalizeIsoDateTime(this.now(), "현재 시각");
      await database.withTransactionAsync(async () => {
        await queuePhotoCleanup(database, ownerKey, localUris, timestamp);
      });
    });
  }

  getRegionProgress(
    ownerKey: LocalRecordOwnerKey,
    scope: LocalRegionProgressScope = "area",
  ): Promise<readonly LocalRegionProgress[]> {
    return this.enqueue(async () => {
      assertOwnerKey(ownerKey);
      const database = await this.provideDatabase();
      const rows = await database.getAllAsync<RegionProgressRow>(
        scope === "sigungu"
          ? `SELECT visit.area_code, visit.sigungu_code,
                    COUNT(*) AS visit_count,
                    MIN(visit.visited_at) AS first_visited_at,
                    MAX(visit.visited_at) AS last_visited_at
             FROM local_record_visits AS visit
             INNER JOIN local_record_days AS day ON day.id = visit.day_id
             INNER JOIN local_records AS record ON record.id = day.record_id
             WHERE record.owner_key = ?
               AND visit.user_confirmed = 1
               AND visit.sigungu_code IS NOT NULL
             GROUP BY visit.area_code, visit.sigungu_code
             ORDER BY visit.area_code ASC, visit.sigungu_code ASC;`
          : `SELECT visit.area_code, NULL AS sigungu_code,
                    COUNT(*) AS visit_count,
                    MIN(visit.visited_at) AS first_visited_at,
                    MAX(visit.visited_at) AS last_visited_at
             FROM local_record_visits AS visit
             INNER JOIN local_record_days AS day ON day.id = visit.day_id
             INNER JOIN local_records AS record ON record.id = day.record_id
             WHERE record.owner_key = ? AND visit.user_confirmed = 1
             GROUP BY visit.area_code
             ORDER BY visit.area_code ASC;`,
        ownerKey,
      );

      return rows.map((row) => ({
        areaCode: row.area_code,
        firstVisitedAt: row.first_visited_at,
        lastVisitedAt: row.last_visited_at,
        sigunguCode: row.sigungu_code,
        visitCount: row.visit_count,
      }));
    });
  }

  getStats(ownerKey: LocalRecordOwnerKey): Promise<LocalRecordStats> {
    return this.enqueue(async () => {
      assertOwnerKey(ownerKey);
      const database = await this.provideDatabase();
      const row = await database.getFirstAsync<RecordStatsRow>(
        `SELECT
           (SELECT COUNT(*) FROM local_records AS record
            WHERE record.owner_key = ?) AS record_count,
           (SELECT COUNT(*)
            FROM local_record_photos AS photo
            INNER JOIN local_record_days AS day ON day.id = photo.day_id
            INNER JOIN local_records AS record ON record.id = day.record_id
            WHERE record.owner_key = ?) AS photo_count,
           (SELECT COUNT(DISTINCT visit.content_id)
            FROM local_record_visits AS visit
            INNER JOIN local_record_days AS day ON day.id = visit.day_id
            INNER JOIN local_records AS record ON record.id = day.record_id
            WHERE record.owner_key = ? AND visit.user_confirmed = 1)
             AS visited_place_count,
           (SELECT COUNT(DISTINCT visit.area_code)
            FROM local_record_visits AS visit
            INNER JOIN local_record_days AS day ON day.id = visit.day_id
            INNER JOIN local_records AS record ON record.id = day.record_id
            WHERE record.owner_key = ? AND visit.user_confirmed = 1)
             AS visited_area_count,
           (SELECT COUNT(DISTINCT visit.area_code || ':' || visit.sigungu_code)
            FROM local_record_visits AS visit
            INNER JOIN local_record_days AS day ON day.id = visit.day_id
            INNER JOIN local_records AS record ON record.id = day.record_id
            WHERE record.owner_key = ? AND visit.user_confirmed = 1
              AND visit.sigungu_code IS NOT NULL) AS visited_sigungu_count;`,
        ownerKey,
        ownerKey,
        ownerKey,
        ownerKey,
        ownerKey,
      );

      return {
        photoCount: row?.photo_count ?? 0,
        recordCount: row?.record_count ?? 0,
        visitedAreaCount: row?.visited_area_count ?? 0,
        visitedPlaceCount: row?.visited_place_count ?? 0,
        visitedSigunguCount: row?.visited_sigungu_count ?? 0,
      };
    });
  }

  deleteRecord(
    ownerKey: LocalRecordOwnerKey,
    recordId: string,
  ): Promise<boolean> {
    return this.enqueue(async () => {
      assertOwnerKey(ownerKey);
      const normalizedRecordId = requireText(recordId, "recordId");
      const database = await this.provideDatabase();
      const timestamp = normalizeIsoDateTime(this.now(), "현재 시각");
      let wasDeleted = false;

      await database.withTransactionAsync(async () => {
        const photos = await database.getAllAsync<PhotoCleanupRow>(
          `SELECT photo.local_uri
           FROM local_record_photos AS photo
           INNER JOIN local_record_days AS day ON day.id = photo.day_id
           INNER JOIN local_records AS record ON record.id = day.record_id
           WHERE record.id = ? AND record.owner_key = ?
             AND photo.local_uri IS NOT NULL;`,
          normalizedRecordId,
          ownerKey,
        );
        await queuePhotoCleanup(
          database,
          ownerKey,
          photos.map((photo) => photo.local_uri),
          timestamp,
        );
        const result = await database.runAsync(
          "DELETE FROM local_records WHERE id = ? AND owner_key = ?;",
          normalizedRecordId,
          ownerKey,
        );
        wasDeleted = result.changes > 0;
      });

      return wasDeleted;
    });
  }

  clearRecords(ownerKey: LocalRecordOwnerKey): Promise<number> {
    return this.enqueue(async () => {
      assertOwnerKey(ownerKey);
      const database = await this.provideDatabase();
      const timestamp = normalizeIsoDateTime(this.now(), "현재 시각");
      let deletedCount = 0;

      await database.withTransactionAsync(async () => {
        const photos = await database.getAllAsync<PhotoCleanupRow>(
          `SELECT photo.local_uri
           FROM local_record_photos AS photo
           INNER JOIN local_record_days AS day ON day.id = photo.day_id
           INNER JOIN local_records AS record ON record.id = day.record_id
           WHERE record.owner_key = ? AND photo.local_uri IS NOT NULL;`,
          ownerKey,
        );
        await queuePhotoCleanup(
          database,
          ownerKey,
          photos.map((photo) => photo.local_uri),
          timestamp,
        );
        const result = await database.runAsync(
          "DELETE FROM local_records WHERE owner_key = ?;",
          ownerKey,
        );
        deletedCount = result.changes;
      });

      return deletedCount;
    });
  }
}

export function createSqliteLocalTravelRecordRepository(
  database: TripicDatabase,
  now?: () => string,
): LocalTravelRecordRepository {
  return new SqliteLocalTravelRecordRepository(
    () => Promise.resolve(database),
    now,
  );
}

export const localTravelRecordRepository: LocalTravelRecordRepository =
  new SqliteLocalTravelRecordRepository();
