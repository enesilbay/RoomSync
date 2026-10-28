import type { SessionSummary } from '@/src/features/focus/engine/types';

/** Cihazda saklanan oturum kaydı (çevrimdışı çalışır; Faz 6'da backend'e senkronlanacak). */
export type FocusSessionRecord = SessionSummary & {
  id: number;
  /** Oda oturumuysa oda adı; solo oturumda null. */
  roomName: string | null;
};

export type NewFocusSessionRecord = Omit<FocusSessionRecord, 'id'>;

/** Yerel takvim gününe göre toplamlar; dateKey "YYYY-MM-DD" (cihaz saat dilimi). */
export type DailyTotals = {
  dateKey: string;
  focusedMs: number;
  sessions: number;
  pickups: number;
};
