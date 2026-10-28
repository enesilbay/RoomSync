import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useAppActive } from '../hooks/useAppActive';
import {
  DEFAULT_SESSION_CONFIG,
  getBreakElapsedMs,
  getFocusedMs,
  getRemainingMs,
  initialSessionState,
  isActivePhase,
  isBreakOverdue,
  sessionReducer,
  summarizeSession,
} from './sessionMachine';
import { useDeskDetector, type DeskDetectorOverrides } from './useDeskDetector';
import type {
  DeskReading,
  FocusMode,
  SessionConfig,
  SessionEvent,
  SessionPhase,
  SessionState,
  SessionSummary,
} from './types';

/** Ekrandaki sayaç ve zamana bağlı geçişler için tik aralığı. */
export const TICK_INTERVAL_MS = 250;

type Options = {
  /** Yeni oturumun modu; aktif oturum START anındaki modu korur. */
  mode: FocusMode;
  config?: Partial<SessionConfig>;
  detectorConfig?: DeskDetectorOverrides;
  /** Oturum başına tam bir kez: süre dolunca veya finish() ile. */
  onCompleted?: (summary: SessionSummary) => void;
  /** Mola başına bir kez, breakLimitMs aşılınca. */
  onBreakOverdue?: () => void;
};

export type FocusSessionResult = {
  state: SessionState;
  phase: SessionPhase;
  remainingMs: number;
  focusedMs: number;
  breakElapsedMs: number;
  reading: DeskReading;
  available: boolean | null;
  start(minutes: number): void;
  finish(): void;
  reset(): void;
  simulateDesk(onDesk: boolean): void;
};

// Odak oturumunun tek kaynağı: durum makinesi + masa algılayıcı + tik döngüsü. Yan etkiler yalnızca effect'lerde.
export function useFocusSession({
  mode,
  config,
  detectorConfig,
  onCompleted,
  onBreakOverdue,
}: Options): FocusSessionResult {
  const sessionConfig: SessionConfig = { ...DEFAULT_SESSION_CONFIG, ...config };
  const [state, dispatch] = useReducer(
    (s: SessionState, e: SessionEvent) => sessionReducer(s, e, sessionConfig),
    initialSessionState,
  );
  const [now, setNow] = useState(() => Date.now());
  const appActive = useAppActive();
  const active = isActivePhase(state.phase);

  const { reading, available, simulate } = useDeskDetector({
    enabled: active,
    mode: active ? state.mode : mode,
    config: detectorConfig,
  });

  // Son geri çağrılar ref'te; effect'ler bunlar değişince yeniden abone olmaz.
  const onCompletedRef = useRef(onCompleted);
  const onBreakOverdueRef = useRef(onBreakOverdue);
  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onBreakOverdueRef.current = onBreakOverdue;
  });

  // Algılayıcı değişimini olaya çevir. Reducer anlamsız olayları yok saydığından tekrar güvenli.
  useEffect(() => {
    if (!active) return;
    dispatch({ type: reading.onDesk ? 'DESK_ON' : 'DESK_OFF', now: Date.now() });
  }, [active, reading.onDesk]);

  // Arka planda sensör durur: telefonun masada olduğu varsayılamaz.
  useEffect(() => {
    if (active && !appActive) dispatch({ type: 'DESK_OFF', now: Date.now() });
  }, [active, appActive]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: 'TICK', now: t });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);

  // Tamamlanma bildirimi: oturum anahtarı (startedAt) ile tam bir kez.
  const completedKeyRef = useRef<number | null>(null);
  useEffect(() => {
    const summary = summarizeSession(state);
    if (!summary || completedKeyRef.current === summary.startedAt) return;
    completedKeyRef.current = summary.startedAt;
    onCompletedRef.current?.(summary);
  }, [state]);

  // Mola uyarısı: mola anahtarı (leftDeskAt) ile mola başına bir kez.
  const overdue = isBreakOverdue(state, now, sessionConfig);
  const overdueKeyRef = useRef<number | null>(null);
  useEffect(() => {
    if (!overdue || state.leftDeskAt === null || overdueKeyRef.current === state.leftDeskAt) return;
    overdueKeyRef.current = state.leftDeskAt;
    onBreakOverdueRef.current?.();
  }, [overdue, state.leftDeskAt]);

  const start = useCallback(
    (minutes: number) => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: 'START', now: t, plannedMs: Math.round(minutes * 60_000), mode });
    },
    [mode],
  );
  const finish = useCallback(() => {
    const t = Date.now();
    setNow(t);
    dispatch({ type: 'FINISH', now: t });
  }, []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    phase: state.phase,
    remainingMs: getRemainingMs(state, now),
    focusedMs: getFocusedMs(state, now),
    breakElapsedMs: getBreakElapsedMs(state, now),
    reading,
    available,
    start,
    finish,
    reset,
    simulateDesk: simulate,
  };
}
