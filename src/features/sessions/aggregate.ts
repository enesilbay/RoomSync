// Oturum kayıtlarından günlük toplamlar (saf fonksiyonlar).
//
// Karar: gece yarısını aşan bir oturumun tamamı BAŞLADIĞI yerel güne yazılır.
// Gerekçe: odak süresi segment bazında saklanmıyor, bölmek tahmine dayanırdı;
// ayrıca depodaki sorgular started_at üzerinden yapıldığı için tutarlı kalır.

import type { SessionSummary } from '@/src/features/focus/engine/types';
import { addLocalDays, localDateKey, startOfLocalDay } from './dateUtils';
import type { DailyTotals } from './types';

/** Toplama için gereken asgari alanlar. */
export type AggregatableSession = Pick<SessionSummary, 'startedAt' | 'focusedMs' | 'pickups'>;

const emptyTotals = (dateKey: string): DailyTotals => ({
  dateKey,
  focusedMs: 0,
  sessions: 0,
  pickups: 0,
});

/**
 * fromTs'nin yerel gününden başlayarak `days` gün için, kronolojik sırada,
 * her gün bir girdi döndürür (oturumsuz günler sıfırla doldurulur).
 */
export function aggregateDaily(
  records: readonly AggregatableSession[],
  fromTs: number,
  days: number,
): DailyTotals[] {
  const count = Math.max(0, Math.floor(days));
  const start = startOfLocalDay(fromTs);
  const byKey = new Map<string, DailyTotals>();
  const result: DailyTotals[] = [];

  for (let i = 0; i < count; i++) {
    const entry = emptyTotals(localDateKey(addLocalDays(start, i)));
    byKey.set(entry.dateKey, entry);
    result.push(entry);
  }

  for (const rec of records) {
    const entry = byKey.get(localDateKey(rec.startedAt));
    if (!entry) continue; // aralık dışı
    entry.focusedMs += rec.focusedMs;
    entry.sessions += 1;
    entry.pickups += rec.pickups;
  }

  return result;
}

/** `now`'ın yerel günü için toplamlar. */
export function todayTotals(records: readonly AggregatableSession[], now: number): DailyTotals {
  return aggregateDaily(records, now, 1)[0];
}
