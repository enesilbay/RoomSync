// expo-sqlite bağlantısı: tembel açılan tekil örnek + PRAGMA user_version ile sürümlü göçler.

import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'roomsync.db';

/**
 * Sıralı göçler: index i, user_version i → i+1 geçişidir.
 * Yeni sürüm = listenin sonuna yeni SQL ekle; eskileri asla değiştirme.
 */
export const MIGRATIONS: readonly string[] = [
  // v1: odak oturumları (FocusSessionRecord alanları, snake_case)
  `CREATE TABLE IF NOT EXISTS focus_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    planned_ms INTEGER NOT NULL,
    focused_ms INTEGER NOT NULL,
    glance_ms INTEGER NOT NULL,
    break_ms INTEGER NOT NULL,
    pickups INTEGER NOT NULL,
    breaks INTEGER NOT NULL,
    mode TEXT NOT NULL,
    completed INTEGER NOT NULL,
    focus_quality REAL NOT NULL,
    room_name TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions (started_at);`,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Bekleyen göçleri sırayla, her birini kendi transaction'ında uygular. */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    const sql = MIGRATIONS[v];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      // PRAGMA parametre almaz; v sayı olduğu için gömmek güvenli.
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

async function openAndMigrate(): Promise<SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await migrate(db);
  return db;
}

let dbPromise: Promise<SQLiteDatabase> | null = null;

/** Veritabanını ilk çağrıda açar ve göçleri çalıştırır; sonraki çağrılar aynı örneği döndürür. */
export function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((err: unknown) => {
      // Başarısız açılış önbelleğe alınmasın; sonraki çağrı yeniden denesin.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/** Yalnızca testler için: tekil örneği sıfırlar. */
export function resetDatabaseForTests(): void {
  dbPromise = null;
}
