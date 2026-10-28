import { useEffect, useRef, useState } from 'react';
import { saveSession } from '@/src/features/sessions';
import { logger } from '@/src/lib/logger';
import { DEFAULT_SESSION_CONFIG, isActivePhase } from '../engine/sessionMachine';
import type { FocusMode, Orientation, SessionPhase, SessionSummary } from '../engine/types';
import { useFocusSession } from '../engine/useFocusSession';
import { cueForTransition, playCompletionChime, playHaptic } from '../feedback';
import { useBatteryHint } from './useBatteryHint';
import { useBreakAlert } from './useBreakAlert';
import { useFocusBrightness } from './useFocusBrightness';
import { useFocusPreferences } from './useFocusPreferences';

export type FocusOverlayKind = 'blackout' | 'minimal' | null;

/**
 * Odakta hangi tam ekran katmanın gösterileceği:
 * - Yüzüstü telefon (iki modda da) → siyah ekran + parlaklık 0.
 * - Sıkı mod odakta her zaman siyah (masadan kalkış onaylanana kadar kısa eğim anında da).
 * - Esnek mod, yüz yukarı → OLED-siyah minimal sayaç.
 */
function overlayFor(phase: SessionPhase, mode: FocusMode, orientation: Orientation): FocusOverlayKind {
  if (phase !== 'focusing') return null;
  if (orientation === 'faceDown' || mode === 'strict') return 'blackout';
  return 'minimal';
}

const BREAK_LIMIT_MS = DEFAULT_SESSION_CONFIG.breakLimitMs;

type Options = {
  /** Oda oturumunda oda adı; solo oturumda null. Kayda olduğu gibi yazılır. */
  roomName: string | null;
  /** Ekran odakta değilse tam ekran katman ve karartma gösterilmez (başka ekranın üstüne çıkmasın). */
  screenFocused: boolean;
  /** true: ekrandan ayrılınca aktif oturum sessizce bitirilir (oda: odadan çıkış oturumu bitirir). */
  endOnBlur?: boolean;
};

// Solo ve oda ekranlarının ortak odak akışı: tercih, durum makinesi, geri bildirim,
// mola bildirimi, parlaklık, pil önerisi ve bitişte yerel kayıt.
export function useFocusFlow({ roomName, screenFocused, endOnBlur = false }: Options) {
  const prefs = useFocusPreferences();
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  // Ekrandan ayrılırken bitirilen oturumun özeti açılmasın (kayıt yine yapılır).
  const quietFinishRef = useRef(false);

  const persist = async (s: SessionSummary) => {
    // Hiç odaklanılmayan (iptal edilen) oturum geçmişe yazılmaz.
    if (s.focusedMs <= 0) return;
    try {
      await saveSession({ ...s, roomName });
    } catch (err) {
      logger.warn('[focus] oturum kaydedilemedi', err);
    }
  };

  const session = useFocusSession({
    mode: prefs.mode,
    onCompleted: (s) => {
      if (!quietFinishRef.current) setSummary(s);
      quietFinishRef.current = false;
      void persist(s);
      if (s.completed) {
        playHaptic('complete');
        playCompletionChime();
      }
    },
    // Uygulama öndeyken: titreşim + durum kartındaki ipucu. Arka planda yerel bildirim devrede.
    onBreakOverdue: () => playHaptic('overdue'),
  });
  const { phase, state, reading } = session;
  const active = isActivePhase(phase);

  // Faz geçişi titreşimleri (başlat, odak başladı, mola başladı).
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    const cue = cueForTransition(prevPhaseRef.current, phase);
    prevPhaseRef.current = phase;
    if (cue) playHaptic(cue);
  }, [phase]);

  useBreakAlert({ phase, leftDeskAt: state.leftDeskAt, breakLimitMs: BREAK_LIMIT_MS });

  // Aktif oturum START anındaki modu korur; diğer fazlarda seçili tercih gösterilir.
  const mode = active ? state.mode : prefs.mode;
  const overlay = screenFocused ? overlayFor(phase, state.mode, reading.orientation) : null;

  useFocusBrightness({
    keepAwake: active,
    dim: screenFocused && phase === 'focusing' && reading.orientation === 'faceDown',
  });

  const battery = useBatteryHint(prefs.minutes);

  const { finish, reset, focusedMs } = session;
  useEffect(() => {
    if (!endOnBlur || screenFocused || !active) return;
    setConfirmingFinish(false);
    if (focusedMs > 0) {
      quietFinishRef.current = true;
      finish();
    } else {
      finish();
      reset();
    }
  }, [endOnBlur, screenFocused, active, focusedMs, finish, reset]);

  const start = () => {
    setSummary(null);
    session.start(prefs.minutes);
  };

  // Hiç odaklanılmadıysa (masaya hiç konmadı) iptal sayılır: kayıt ve özet yok.
  const requestFinish = () => {
    if (session.focusedMs > 0) {
      setConfirmingFinish(true);
      return;
    }
    session.finish();
    session.reset();
  };
  const confirmFinish = () => {
    setConfirmingFinish(false);
    session.finish();
  };
  const cancelFinish = () => setConfirmingFinish(false);

  const closeSummary = () => setSummary(null);
  const newSession = () => {
    setSummary(null);
    session.reset();
  };

  return {
    phase,
    state,
    reading,
    remainingMs: session.remainingMs,
    focusedMs: session.focusedMs,
    breakElapsedMs: session.breakElapsedMs,
    breakOverdue: phase === 'break' && session.breakElapsedMs >= BREAK_LIMIT_MS,
    active,
    mode,
    setMode: prefs.setMode,
    minutes: prefs.minutes,
    setMinutes: prefs.setMinutes,
    overlay,
    battery,
    summary,
    confirmingFinish: confirmingFinish && active,
    start,
    requestFinish,
    confirmFinish,
    cancelFinish,
    closeSummary,
    newSession,
    simulateDesk: session.simulateDesk,
  };
}

export type FocusFlow = ReturnType<typeof useFocusFlow>;
