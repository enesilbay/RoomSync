import { useEffect, useRef } from 'react';
import type { SessionPhase } from '../engine/types';
import { cancelBreakAlert, decideBreakAlert, scheduleBreakAlert } from '../notifications';

type Options = {
  phase: SessionPhase;
  leftDeskAt: number | null;
  breakLimitMs: number;
};

type Scheduled = { key: number; id: Promise<string | null> };

// Faz değişimlerini "mola uzadı" yerel bildirimine çevirir; ekran kapanınca kurulu bildirimi iptal eder.
export function useBreakAlert({ phase, leftDeskAt, breakLimitMs }: Options): void {
  const scheduledRef = useRef<Scheduled | null>(null);

  useEffect(() => {
    const current = scheduledRef.current;
    const decision = decideBreakAlert({
      phase,
      leftDeskAt,
      scheduledKey: current?.key ?? null,
      breakLimitMs,
      now: Date.now(),
    });
    if (decision.type === 'none') return;
    if (current) void cancelBreakAlert(current.id);
    scheduledRef.current =
      decision.type === 'schedule' ? { key: decision.key, id: scheduleBreakAlert(decision.fireAt) } : null;
  }, [phase, leftDeskAt, breakLimitMs]);

  useEffect(
    () => () => {
      if (scheduledRef.current) void cancelBreakAlert(scheduledRef.current.id);
      scheduledRef.current = null;
    },
    [],
  );
}
