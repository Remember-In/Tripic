import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "tripic.db";
const DATABASE_VERSION = 2;

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

const migrationV1 = `
  CREATE TABLE IF NOT EXISTS local_records (
    id TEXT PRIMARY KEY NOT NULL,
    owner_key TEXT NOT NULL
      CHECK (owner_key = 'guest' OR owner_key GLOB 'user:?*'),
    title TEXT NOT NULL,
    theme TEXT
      CHECK (
        theme IS NULL OR theme IN (
          'NATURE_SCENERY',
          'HISTORY_CULTURE',
          'FOOD_EXPERIENCE',
          'REGION_COMPLETE'
        )
      ),
    style TEXT
      CHECK (
        style IS NULL OR style IN (
          'DOCU_NARRATION',
          'EMOTIONAL_ESSAY',
          'FRIEND_CHAT'
        )
      ),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS local_record_days (
    id TEXT PRIMARY KEY NOT NULL,
    record_id TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    day_index INTEGER NOT NULL CHECK (day_index >= 0),
    note TEXT,
    FOREIGN KEY (record_id) REFERENCES local_records(id) ON DELETE CASCADE,
    UNIQUE (record_id, visit_date),
    UNIQUE (record_id, day_index)
  );

  CREATE TABLE IF NOT EXISTS local_record_photos (
    id TEXT PRIMARY KEY NOT NULL,
    day_id TEXT NOT NULL,
    local_asset_id TEXT,
    local_uri TEXT,
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    FOREIGN KEY (day_id) REFERENCES local_record_days(id) ON DELETE CASCADE,
    CHECK (local_asset_id IS NOT NULL OR local_uri IS NOT NULL),
    UNIQUE (day_id, id),
    UNIQUE (day_id, sort_order)
  );

  CREATE TABLE IF NOT EXISTS local_record_visits (
    id TEXT PRIMARY KEY NOT NULL,
    day_id TEXT NOT NULL,
    photo_id TEXT,
    content_id TEXT NOT NULL,
    visited_at TEXT NOT NULL,
    area_code TEXT NOT NULL,
    sigungu_code TEXT,
    category_code TEXT,
    match_method TEXT NOT NULL
      CHECK (
        match_method IN (
          'GPS_CANDIDATE',
          'MANUAL_SEARCH',
          'MANUAL_REGION_SELECT'
        )
      ),
    match_confidence TEXT NOT NULL
      CHECK (match_confidence IN ('HIGH', 'MEDIUM', 'LOW', 'MANUAL')),
    user_confirmed INTEGER NOT NULL DEFAULT 1
      CHECK (user_confirmed = 1),
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (day_id) REFERENCES local_record_days(id) ON DELETE CASCADE,
    FOREIGN KEY (day_id, photo_id)
      REFERENCES local_record_photos(day_id, id) ON DELETE CASCADE,
    UNIQUE (day_id, sort_order)
  );

  CREATE TABLE IF NOT EXISTS local_record_tags (
    record_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    PRIMARY KEY (record_id, tag),
    FOREIGN KEY (record_id) REFERENCES local_records(id) ON DELETE CASCADE,
    UNIQUE (record_id, sort_order)
  );

  CREATE INDEX IF NOT EXISTS local_records_owner_updated_idx
    ON local_records(owner_key, updated_at DESC);
  CREATE INDEX IF NOT EXISTS local_record_days_record_idx
    ON local_record_days(record_id, day_index);
  CREATE INDEX IF NOT EXISTS local_record_photos_day_idx
    ON local_record_photos(day_id, sort_order);
  CREATE INDEX IF NOT EXISTS local_record_visits_day_idx
    ON local_record_visits(day_id, sort_order);
  CREATE INDEX IF NOT EXISTS local_record_visits_region_idx
    ON local_record_visits(area_code, sigungu_code);
  CREATE INDEX IF NOT EXISTS local_record_visits_content_idx
    ON local_record_visits(content_id);

  PRAGMA user_version = 1;
`;

const migrationV2 = `
  CREATE TABLE IF NOT EXISTS local_photo_cleanup_queue (
    local_uri TEXT PRIMARY KEY NOT NULL,
    owner_key TEXT NOT NULL
      CHECK (owner_key = 'guest' OR owner_key GLOB 'user:?*'),
    queued_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS local_photo_cleanup_owner_idx
    ON local_photo_cleanup_queue(owner_key, queued_at);

  PRAGMA user_version = 2;
`;

/**
 * Tripic 로컬 저장소를 현재 스키마로 올린다.
 *
 * 좌표, EXIF 원문, 관광공사 응답/명칭/주소/원격 이미지 URL은 이 스키마에
 * 저장할 수 없도록 의도적으로 컬럼을 두지 않는다.
 */
export async function migrateTripicDatabase(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  await database.execAsync("PRAGMA foreign_keys = ON;");
  await database.execAsync("PRAGMA journal_mode = WAL;");

  const version = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const currentVersion = version?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `지원하지 않는 Tripic DB 버전입니다: ${currentVersion} (지원: ${DATABASE_VERSION})`,
    );
  }

  if (currentVersion < 1) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV1);
    });
  }

  if (currentVersion < 2) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV2);
    });
  }
}

async function createTripicDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  try {
    await migrateTripicDatabase(database);
    return database;
  } catch (error) {
    await database.closeAsync();
    throw error;
  }
}

/** 공유 가능한 단일 비동기 DB 연결을 반환한다. */
export function openTripicDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = createTripicDatabase().catch((error: unknown) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}

export type TripicDatabase = SQLite.SQLiteDatabase;
