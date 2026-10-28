// Bugünün yerel odak istatistikleri: mount'ta yükler, ekran odağında ve yeni kayıtta yeniler.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { logger } from '@/src/lib/logger';
import { sessionEvents } from './events';
import { getTodayTotals } from './repository';
import type { DailyTotals } from './types';

export type TodayStats = {
  /** Aşağı yuvarlanmış odak dakikası. */
  focusedMinutes: number;
  sessions: number;
  pickups: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useTodayStats(): TodayStats {
  const [totals, setTotals] = useState<DailyTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(false);
  // Yalnızca en son isteğin sonucu yazılsın (yarış koruması).
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current;
    try {
      const next = await getTodayTotals(Date.now());
      if (mountedRef.current && requestId === requestRef.current) setTotals(next);
    } catch (err) {
      logger.warn('[sessions] bugünün istatistikleri okunamadı', err);
    } finally {
      if (mountedRef.current && requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const unsubscribe = sessionEvents.subscribe(() => {
      void refresh();
    });
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [refresh]);

  // Sekmeye dönüşte yenile (gün değişimi ve başka ekranda yapılan kayıtlar için).
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    focusedMinutes: Math.floor((totals?.focusedMs ?? 0) / 60_000),
    sessions: totals?.sessions ?? 0,
    pickups: totals?.pickups ?? 0,
    loading,
    refresh,
  };
}
