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

  // setState yalnızca promise geri çağrılarında (effect içinde senkron setState yok).
  const refresh = useCallback((): Promise<void> => {
    const requestId = ++requestRef.current;
    const isLatest = () => mountedRef.current && requestId === requestRef.current;
    return getTodayTotals(Date.now())
      .then(
        (next) => {
          if (isLatest()) setTotals(next);
        },
        (err: unknown) => {
          logger.warn('[sessions] bugünün istatistikleri okunamadı', err);
        },
      )
      .finally(() => {
        if (isLatest()) setLoading(false);
      });
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
