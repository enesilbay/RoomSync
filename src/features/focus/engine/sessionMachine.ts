// Saf odak oturumu durum makinesi. Süreler tik saymadan, olay zaman damgalarından hesaplanır.
import type { SessionConfig, SessionEvent, SessionPhase, SessionState, SessionSummary } from './types';

/**
 * glanceGraceMs 8 sn: bildirime/saate bakmak için kaldırma mola sayılmaz (yol haritası: 5–10 sn).
 * breakLimitMs 5 dk: klasik Pomodoro kısa molası; aşılınca kullanıcı uyarılır.
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  glanceGraceMs: 8_000,
  breakLimitMs: 5 * 60_000,
};

export const initialSessionState: SessionState = {
  phase: 'idle',
  mode: 'flexible',
  plannedMs: 0,
  startedAt: null,
  endedAt: null,
  focusedMs: 0,
  segmentStartedAt: null,
  leftDeskAt: null,
  glanceMs: 0,
  breakMs: 0,
  pickups: 0,
  breaks: 0,
  completed: false,
};

const ACTIVE_PHASES: readonly SessionPhase[] = ['waiting', 'focusing', 'glancing', 'break'];

/** Sensörün dinlendiği, sayaçların işlediği fazlar. */
export function isActivePhase(phase: SessionPhase): boolean {
  return ACTIVE_PHASES.includes(phase);
}

const elapsed = (from: number | null, now: number) => (from === null ? 0 : Math.max(0, now - from));

/**
 * Zamana bağlı geçişleri `now` anına kadar uygular (geç gelen tik/olay telafisi):
 * odak süresi dolduysa tam bitiş anında tamamlanır, bakış toleransı aştıysa mola olur.
 * Değişiklik yoksa aynı nesne döner.
 */
function advance(state: SessionState, now: number, config: SessionConfig): SessionState {
  if (state.phase === 'focusing' && state.segmentStartedAt !== null) {
    const remaining = state.plannedMs - state.focusedMs;
    if (elapsed(state.segmentStartedAt, now) >= remaining) {
      return {
        ...state,
        phase: 'completed',
        focusedMs: state.plannedMs,
        segmentStartedAt: null,
        endedAt: state.segmentStartedAt + Math.max(0, remaining),
        completed: true,
      };
    }
  }
  if (state.phase === 'glancing' && elapsed(state.leftDeskAt, now) >= config.glanceGraceMs) {
    // Mola süresi leftDeskAt'ten sayılır; leftDeskAt korunur.
    return { ...state, phase: 'break' };
  }
  return state;
}

/** Açık bakış/molayı kapatıp ilgili sayaca ekler. */
function closeAway(state: SessionState, now: number): SessionState {
  const away = elapsed(state.leftDeskAt, now);
  if (state.phase === 'glancing') {
    return { ...state, glanceMs: state.glanceMs + away, leftDeskAt: null };
  }
  if (state.phase === 'break') {
    return { ...state, breakMs: state.breakMs + away, breaks: state.breaks + 1, leftDeskAt: null };
  }
  return state;
}

export function sessionReducer(state: SessionState, event: SessionEvent, config: SessionConfig): SessionState {
  switch (event.type) {
    case 'RESET':
      return state.phase === 'idle' ? state : initialSessionState;

    case 'START': {
      if (state.phase !== 'idle' && state.phase !== 'completed') return state;
      if (!Number.isFinite(event.plannedMs) || event.plannedMs <= 0) return state;
      return {
        ...initialSessionState,
        phase: 'waiting',
        mode: event.mode,
        plannedMs: event.plannedMs,
        startedAt: event.now,
      };
    }

    case 'TICK':
      return advance(state, event.now, config);

    case 'DESK_ON': {
      const s = advance(state, event.now, config);
      if (s.phase !== 'waiting' && s.phase !== 'glancing' && s.phase !== 'break') return s;
      return { ...closeAway(s, event.now), phase: 'focusing', segmentStartedAt: event.now };
    }

    case 'DESK_OFF': {
      const s = advance(state, event.now, config);
      if (s.phase !== 'focusing') return s;
      return {
        ...s,
        phase: 'glancing',
        focusedMs: s.focusedMs + elapsed(s.segmentStartedAt, event.now),
        segmentStartedAt: null,
        leftDeskAt: event.now,
        pickups: s.pickups + 1,
      };
    }

    case 'FINISH': {
      // Süre zaten dolmuşsa erken bitiş değil, tamamlanmış sayılır.
      const s = advance(state, event.now, config);
      if (!isActivePhase(s.phase)) return s;
      const closed = closeAway(s, event.now);
      return {
        ...closed,
        phase: 'completed',
        focusedMs: closed.focusedMs + (s.phase === 'focusing' ? elapsed(s.segmentStartedAt, event.now) : 0),
        segmentStartedAt: null,
        endedAt: event.now,
        completed: false,
      };
    }

    default:
      return state;
  }
}

/** Devam eden segment dahil odak süresi (plannedMs ile sınırlı). */
export function getFocusedMs(state: SessionState, now: number): number {
  if (state.phase !== 'focusing') return state.focusedMs;
  return Math.min(state.plannedMs, state.focusedMs + elapsed(state.segmentStartedAt, now));
}

export function getRemainingMs(state: SessionState, now: number): number {
  return Math.max(0, state.plannedMs - getFocusedMs(state, now));
}

/** Devam eden molanın süresi (leftDeskAt'ten itibaren); molada değilse 0. */
export function getBreakElapsedMs(state: SessionState, now: number): number {
  return state.phase === 'break' ? elapsed(state.leftDeskAt, now) : 0;
}

export function isBreakOverdue(state: SessionState, now: number, config: SessionConfig): boolean {
  return state.phase === 'break' && elapsed(state.leftDeskAt, now) >= config.breakLimitMs;
}

export function computeFocusQuality(focusedMs: number, glanceMs: number, breakMs: number): number {
  const total = focusedMs + glanceMs + breakMs;
  return total <= 0 ? 100 : Math.round((100 * focusedMs) / total);
}

/** Yalnızca biten oturum için özet; aksi halde null. */
export function summarizeSession(state: SessionState): SessionSummary | null {
  if (state.phase !== 'completed' || state.startedAt === null || state.endedAt === null) return null;
  return {
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    plannedMs: state.plannedMs,
    focusedMs: state.focusedMs,
    glanceMs: state.glanceMs,
    breakMs: state.breakMs,
    pickups: state.pickups,
    breaks: state.breaks,
    mode: state.mode,
    completed: state.completed,
    focusQuality: computeFocusQuality(state.focusedMs, state.glanceMs, state.breakMs),
  };
}
