// Oturum geçmişinin dışa açık deposu. Yerelde SQLite; web'de ya da SQLite
// açılamazsa aynı arayüzle AsyncStorage yedeğine düşer (ekranı asla çökertmez).

import { Platform } from 'react-native';
import { logger } from '@/src/lib/logger';
import { aggregateDaily } from './aggregate';
import { addLocalDays, startOfLocalDay } from './dateUtils';
import { getDatabase, resetDatabaseForTests } from './db';
import { sessionEvents } from './events';
import {
  createAsyncStorageStore,
  createSqliteStore,
  type ListSessionsQuery,
  type SessionStore,
} from './store';
import type { DailyTotals, FocusSessionRecord, NewFocusSessionRecord } from './types';

export type { ListSessionsQuery } from './store';

let storePromise: Promise<SessionStore> | null = null;

async function resolveStore(): Promise<SessionStore> {
  // expo-sqlite web'de wasm + COOP/COEP başlıkları istiyor; web'de doğrudan yedek.
  if (Platform.OS === 'web') {
    logger.info('[sessions] web: oturum geçmişi AsyncStorage yedeğinde tutuluyor');
    return createAsyncStorageStore();
  }
  try {
    return createSqliteStore(await getDatabase());
  } catch (err) {
    // Bu oturum boyunca yedekte kal; uyarı yalnızca bir kez loglanır.
    logger.warn('[sessions] SQLite açılamadı, AsyncStorage yedeğine geçildi', err);
    return createAsyncStorageStore();
  }
}

function getStore(): Promise<SessionStore> {
  if (!storePromise) storePromise = resolveStore();
  return storePromise;
}

/** Biten oturumu kaydeder, yeni id'yi döndürür ve 'saved' olayı yayar. Yazma hatasında reddeder. */
export async function saveSession(rec: NewFocusSessionRecord): Promise<number> {
  const store = await getStore();
  const id = await store.insert(rec);
  sessionEvents.emit({ type: 'saved', record: { ...rec, roomName: rec.roomName ?? null, id } });
  return id;
}

/** startedAt'e göre filtreli liste (from dahil, to hariç), en yeni önce. */
export async function listSessions(query: ListSessionsQuery = {}): Promise<FocusSessionRecord[]> {
  const store = await getStore();
  return store.list(query);
}

/** Bugün dahil son `days` yerel gün; kronolojik, sıfır dolgulu. */
export async function getDailyTotals(days = 7, now: number = Date.now()): Promise<DailyTotals[]> {
  const count = Math.max(1, Math.floor(days));
  const from = startOfLocalDay(addLocalDays(now, -(count - 1)));
  const to = addLocalDays(startOfLocalDay(now), 1);
  const records = await listSessions({ from, to });
  return aggregateDaily(records, from, count);
}

export async function getTodayTotals(now: number = Date.now()): Promise<DailyTotals> {
  const [today] = await getDailyTotals(1, now);
  return today;
}

/** Tüm yerel geçmişi siler (Faz 3 "verilerimi sil" için) ve 'cleared' olayı yayar. */
export async function clearAllSessions(): Promise<void> {
  const store = await getStore();
  await store.clear();
  sessionEvents.emit({ type: 'cleared' });
}

/** Yalnızca testler için: seçilen depoyu ve DB tekil örneğini sıfırlar. */
export function resetSessionStoreForTests(): void {
  storePromise = null;
  resetDatabaseForTests();
}
