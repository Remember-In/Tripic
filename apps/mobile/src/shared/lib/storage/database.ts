import * as SQLite from "expo-sqlite";

/**
 * 사용자 확정 방문 기록만 로컬에 저장한다.
 * 관광공사 응답 원문과 사진 EXIF GPS 좌표는 이 DB에 저장하지 않는다.
 */
export async function openTripicDatabase() {
  const database = await SQLite.openDatabaseAsync("tripic.db");

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS local_photos (
      id TEXT PRIMARY KEY NOT NULL,
      local_asset_id TEXT NOT NULL,
      taken_at TEXT,
      has_gps INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS visit_records (
      id TEXT PRIMARY KEY NOT NULL,
      local_photo_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      visited_at TEXT NOT NULL,
      area_code TEXT NOT NULL,
      sigungu_code TEXT,
      category_code TEXT,
      match_method TEXT NOT NULL,
      match_confidence TEXT NOT NULL,
      user_confirmed INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (local_photo_id) REFERENCES local_photos(id)
    );
  `);

  return database;
}
