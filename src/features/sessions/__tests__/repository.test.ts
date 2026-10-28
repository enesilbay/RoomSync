import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { logger } from '@/src/lib/logger';
import { SCHEMA_VERSION } from '../db';
import { sessionEvents } from '../events';
import {
  clearAllSessions,
  getDailyTotals,
  getTodayTotals,
  listSessions,
  resetSessionStoreForTests,
  saveSession,
} from '../repository';
import { FALLBACK_STORAGE_KEY, type FocusSessionRow } from '../store';
import type { NewFocusSessionRecord } from '../types';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

type Params = (string | number | null)[];

/** Depo katmanının kullandığı birkaç yöntemi taklit eden bellek içi SQLite. */
class FakeDb {
  userVersion = 0;
  tableCreated = false;
  journalMode: string | null = null;
  migrationRuns = 0;
  rows: FocusSessionRow[] = [];
  nextId = 1;
  sqlLog: string[] = [];

  getFirstAsync = jest.fn(async (sql: string) => {
    if (/PRAGMA user_version/.test(sql)) return { user_version: this.userVersion };
    throw new Error(`beklenmeyen sorgu: ${sql}`);
  });

  execAsync = jest.fn(async (sql: string) => {
    this.sqlLog.push(sql);
    const version = /PRAGMA user_version = (\d+)/.exec(sql);
    if (version) {
      this.userVersion = Number(version[1]);
      return;
    }
    const journal = /PRAGMA journal_mode = (\w+)/.exec(sql);
    if (journal) {
      this.journalMode = journal[1];
      return;
    }
    if (/CREATE TABLE IF NOT EXISTS focus_sessions/.test(sql)) {
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS \w+ ON focus_sessions \(started_at\)/);
      this.tableCreated = true;
      this.migrationRuns += 1;
    }
  });

  withTransactionAsync = jest.fn(async (task: () => Promise<void>) => {
    await task();
  });

  runAsync = jest.fn(async (sql: string, params: Params = []) => {
    if (/^INSERT INTO focus_sessions/.test(sql)) {
      const [started_at, ended_at, planned_ms, focused_ms, glance_ms, break_ms, pickups, breaks, mode, completed, focus_quality, room_name] =
        params;
      const id = this.nextId++;
      this.rows.push({
        id,
        started_at: started_at as number,
        ended_at: ended_at as number,
        planned_ms: planned_ms as number,
        focused_ms: focused_ms as number,
        glance_ms: glance_ms as number,
        break_ms: break_ms as number,
        pickups: pickups as number,
        breaks: breaks as number,
        mode: mode as string,
        completed: completed as number,
        focus_quality: focus_quality as number,
        room_name: room_name as string | null,
      });
      return { lastInsertRowId: id, changes: 1 };
    }
    if (/^DELETE FROM focus_sessions/.test(sql)) {
      const changes = this.rows.length;
      this.rows = [];
      return { lastInsertRowId: 0, changes };
    }
    throw new Error(`beklenmeyen komut: ${sql}`);
  });

  getAllAsync = jest.fn(async (sql: string, params: Params = []) => {
    // Parametreler SQL'deki sırayla: from, to, limit (her biri opsiyonel).
    const queue = [...params];
    const from = /started_at >= \?/.test(sql) ? (queue.shift() as number) : undefined;
    const to = /started_at < \?/.test(sql) ? (queue.shift() as number) : undefined;
    const limit = /LIMIT \?/.test(sql) ? (queue.shift() as number) : undefined;
    expect(sql).toMatch(/ORDER BY started_at DESC, id DESC/);
    const out = this.rows
      .filter((r) => (from === undefined || r.started_at >= from) && (to === undefined || r.started_at < to))
      .sort((a, b) => b.started_at - a.started_at || b.id - a.id);
    return limit === undefined ? out : out.slice(0, limit);
  });
}

const openMock = SQLite.openDatabaseAsync as unknown as jest.Mock;
const MIN = 60_000;
const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min).getTime();

const rec = (overrides: Partial<NewFocusSessionRecord> = {}): NewFocusSessionRecord => ({
  startedAt: at(28, 9),
  endedAt: at(28, 9, 30),
  plannedMs: 25 * MIN,
  focusedMs: 24 * MIN,
  glanceMs: 30_000,
  breakMs: 30_000,
  pickups: 2,
  breaks: 1,
  mode: 'strict',
  completed: true,
  focusQuality: 96,
  roomName: null,
  ...overrides,
});

let fake: FakeDb;

beforeEach(async () => {
  resetSessionStoreForTests();
  fake = new FakeDb();
  openMock.mockReset();
  openMock.mockResolvedValue(fake);
  await AsyncStorage.clear();
  jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
  jest.spyOn(logger, 'info').mockImplementation(() => undefined);
});

describe('SQLite deposu', () => {
  it('kaydı kaydedip listelediğinde camelCase alanlara eşler (round-trip)', async () => {
    const input = rec({ roomName: 'Kütüphane', completed: false, mode: 'flexible' });
    const id = await saveSession(input);
    expect(id).toBe(1);

    // Satır snake_case ve completed 0/1 olarak yazılır.
    expect(fake.rows[0]).toMatchObject({ started_at: input.startedAt, focused_ms: input.focusedMs, completed: 0, room_name: 'Kütüphane' });

    const list = await listSessions();
    expect(list).toEqual([{ ...input, id: 1 }]);
  });

  it('veritabanını bir kez açar, WAL açar ve göçü yalnızca bir kez çalıştırır', async () => {
    await saveSession(rec());
    await saveSession(rec({ startedAt: at(28, 11) }));
    await listSessions();

    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith('roomsync.db');
    expect(fake.journalMode).toBe('WAL');
    expect(fake.migrationRuns).toBe(1);
    expect(fake.userVersion).toBe(SCHEMA_VERSION);
    expect(fake.withTransactionAsync).toHaveBeenCalledTimes(SCHEMA_VERSION);
  });

  it('şema güncelse göç çalıştırmaz', async () => {
    fake.userVersion = SCHEMA_VERSION;
    await listSessions();
    expect(fake.migrationRuns).toBe(0);
    expect(fake.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('listeyi from/to/limit ile filtreler ve en yeniyi önce döndürür', async () => {
    await saveSession(rec({ startedAt: at(26, 9) }));
    await saveSession(rec({ startedAt: at(27, 9) }));
    await saveSession(rec({ startedAt: at(28, 9) }));

    const ranged = await listSessions({ from: at(27, 0), to: at(28, 0) });
    expect(ranged.map((r) => r.startedAt)).toEqual([at(27, 9)]);

    const limited = await listSessions({ limit: 2 });
    expect(limited.map((r) => r.startedAt)).toEqual([at(28, 9), at(27, 9)]);
    expect(fake.getAllAsync).toHaveBeenLastCalledWith(
      'SELECT * FROM focus_sessions ORDER BY started_at DESC, id DESC LIMIT ?',
      [2],
    );
  });

  it('kayıtta "saved" olayı yayar; abonelik kaldırılınca yaymaz', async () => {
    const listener = jest.fn();
    const unsubscribe = sessionEvents.subscribe(listener);
    const input = rec();
    const id = await saveSession(input);
    expect(listener).toHaveBeenCalledWith({ type: 'saved', record: { ...input, id } });

    unsubscribe();
    await saveSession(rec());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('günlük toplamları sıfır dolgulu, kronolojik döndürür', async () => {
    await saveSession(rec({ startedAt: at(26, 9), focusedMs: 10 * MIN, pickups: 1 }));
    await saveSession(rec({ startedAt: at(28, 8), focusedMs: 20 * MIN, pickups: 0 }));
    await saveSession(rec({ startedAt: at(28, 20), focusedMs: 5 * MIN, pickups: 3 }));
    await saveSession(rec({ startedAt: at(29, 1), focusedMs: 99 * MIN })); // gelecek gün, dahil değil

    const week = await getDailyTotals(7, at(28, 21));
    expect(week).toHaveLength(7);
    expect(week[0].dateKey).toBe('2026-10-22');
    expect(week[6]).toEqual({ dateKey: '2026-10-28', focusedMs: 25 * MIN, sessions: 2, pickups: 3 });
    expect(week[4]).toEqual({ dateKey: '2026-10-26', focusedMs: 10 * MIN, sessions: 1, pickups: 1 });
    expect(week[5].sessions).toBe(0);

    await expect(getTodayTotals(at(28, 21))).resolves.toEqual(week[6]);
  });

  it('clearAllSessions her şeyi siler ve "cleared" yayar', async () => {
    const listener = jest.fn();
    const unsubscribe = sessionEvents.subscribe(listener);
    await saveSession(rec());
    await clearAllSessions();
    expect(await listSessions()).toEqual([]);
    expect(listener).toHaveBeenLastCalledWith({ type: 'cleared' });
    unsubscribe();
  });
});

describe('AsyncStorage yedeği', () => {
  it('web\'de SQLite açmadan aynı arayüzle çalışır', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const a = rec({ startedAt: at(28, 8), roomName: 'Oda' });
    const b = rec({ startedAt: at(28, 10) });

    expect(await saveSession(a)).toBe(1);
    expect(await saveSession(b)).toBe(2);
    expect(openMock).not.toHaveBeenCalled();

    expect(await listSessions()).toEqual([
      { ...b, id: 2 },
      { ...a, id: 1 },
    ]);
    expect(await listSessions({ from: at(28, 9) })).toEqual([{ ...b, id: 2 }]);
    expect((await getTodayTotals(at(28, 12))).sessions).toBe(2);
    expect(await AsyncStorage.getItem(FALLBACK_STORAGE_KEY)).not.toBeNull();
    expect(logger.info).toHaveBeenCalledTimes(1);

    await clearAllSessions();
    expect(await listSessions()).toEqual([]);
  });

  it('SQLite açılamazsa yedeğe düşer ve yalnızca bir kez uyarır', async () => {
    openMock.mockRejectedValue(new Error('native modül yok'));
    const listener = jest.fn();
    const unsubscribe = sessionEvents.subscribe(listener);

    await saveSession(rec());
    await saveSession(rec({ startedAt: at(28, 12) }));
    const list = await listSessions();

    expect(list.map((r) => r.id)).toEqual([2, 1]);
    expect(openMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('eşzamanlı kayıtlar birbirini ezmez', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const ids = await Promise.all([saveSession(rec()), saveSession(rec()), saveSession(rec())]);
    expect([...ids].sort()).toEqual([1, 2, 3]);
    expect(await listSessions()).toHaveLength(3);
  });

  it('bozuk veride çökmez, boş liste döndürür', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await AsyncStorage.setItem(FALLBACK_STORAGE_KEY, '{bozuk');
    await expect(listSessions()).resolves.toEqual([]);
    expect(await saveSession(rec())).toBe(1);
  });
});
