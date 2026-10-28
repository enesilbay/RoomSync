// Depo arayüzü ve iki uygulaması: SQLite (yerel) ve AsyncStorage (web / yedek).

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import type { FocusMode } from '@/src/features/focus/engine/types';
import { logger } from '@/src/lib/logger';
import type { FocusSessionRecord, NewFocusSessionRecord } from './types';

/** startedAt'e göre filtre: from dahil, to hariç. limit yoksa sınırsız. */
export type ListSessionsQuery = {
  from?: number;
  to?: number;
  limit?: number;
};

export type SessionStore = {
  insert: (rec: NewFocusSessionRecord) => Promise<number>;
  /** En yeni oturum önce (started_at DESC, id DESC). */
  list: (query: ListSessionsQuery) => Promise<FocusSessionRecord[]>;
  clear: () => Promise<void>;
};

const toMode = (value: unknown): FocusMode => (value === 'strict' ? 'strict' : 'flexible');

const validLimit = (limit: number | undefined): number | null =>
  limit !== undefined && Number.isFinite(limit) && limit >= 0 ? Math.floor(limit) : null;

// ── SQLite ──

/** focus_sessions satırı (snake_case). */
export type FocusSessionRow = {
  id: number;
  started_at: number;
  ended_at: number;
  planned_ms: number;
  focused_ms: number;
  glance_ms: number;
  break_ms: number;
  pickups: number;
  breaks: number;
  mode: string;
  completed: number;
  focus_quality: number;
  room_name: string | null;
};

export function rowToRecord(row: FocusSessionRow): FocusSessionRecord {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    plannedMs: row.planned_ms,
    focusedMs: row.focused_ms,
    glanceMs: row.glance_ms,
    breakMs: row.break_ms,
    pickups: row.pickups,
    breaks: row.breaks,
    mode: toMode(row.mode),
    completed: row.completed === 1,
    focusQuality: row.focus_quality,
    roomName: row.room_name ?? null,
  };
}

const INSERT_SQL = `INSERT INTO focus_sessions
  (started_at, ended_at, planned_ms, focused_ms, glance_ms, break_ms, pickups, breaks, mode, completed, focus_quality, room_name)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export function createSqliteStore(db: SQLiteDatabase): SessionStore {
  return {
    async insert(rec) {
      const result = await db.runAsync(INSERT_SQL, [
        rec.startedAt,
        rec.endedAt,
        rec.plannedMs,
        rec.focusedMs,
        rec.glanceMs,
        rec.breakMs,
        rec.pickups,
        rec.breaks,
        rec.mode,
        rec.completed ? 1 : 0,
        rec.focusQuality,
        rec.roomName ?? null,
      ]);
      return result.lastInsertRowId;
    },
    async list({ from, to, limit }) {
      const where: string[] = [];
      const params: SQLiteBindValue[] = [];
      if (from !== undefined) {
        where.push('started_at >= ?');
        params.push(from);
      }
      if (to !== undefined) {
        where.push('started_at < ?');
        params.push(to);
      }
      let sql = 'SELECT * FROM focus_sessions';
      if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
      sql += ' ORDER BY started_at DESC, id DESC';
      const lim = validLimit(limit);
      if (lim !== null) {
        sql += ' LIMIT ?';
        params.push(lim);
      }
      const rows = await db.getAllAsync<FocusSessionRow>(sql, params);
      return rows.map(rowToRecord);
    },
    async clear() {
      await db.runAsync('DELETE FROM focus_sessions');
    },
  };
}

// ── AsyncStorage (web / yedek) ──

export const FALLBACK_STORAGE_KEY = '@roomsync/focus_sessions/v1';

const isRecord = (v: unknown): v is FocusSessionRecord => {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'number' && typeof o.startedAt === 'number' && typeof o.focusedMs === 'number';
};

export function createAsyncStorageStore(): SessionStore {
  // Yazmaları sıraya koy: eşzamanlı insert'ler birbirinin üstüne yazmasın.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  };

  const readAll = async (): Promise<FocusSessionRecord[]> => {
    const raw = await AsyncStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isRecord).map((r) => ({ ...r, mode: toMode(r.mode), roomName: r.roomName ?? null }));
    } catch (err) {
      logger.warn('[sessions] yedek depo bozuk, boş kabul ediliyor', err);
      return [];
    }
  };

  return {
    insert(rec) {
      return enqueue(async () => {
        const all = await readAll();
        const id = all.reduce((max, r) => Math.max(max, r.id), 0) + 1;
        all.push({ ...rec, roomName: rec.roomName ?? null, id });
        await AsyncStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(all));
        return id;
      });
    },
    async list({ from, to, limit }) {
      const all = await readAll();
      const filtered = all
        .filter((r) => (from === undefined || r.startedAt >= from) && (to === undefined || r.startedAt < to))
        .sort((a, b) => b.startedAt - a.startedAt || b.id - a.id);
      const lim = validLimit(limit);
      return lim === null ? filtered : filtered.slice(0, lim);
    },
    clear() {
      return enqueue(() => AsyncStorage.removeItem(FALLBACK_STORAGE_KEY));
    },
  };
}
