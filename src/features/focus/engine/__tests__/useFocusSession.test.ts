import { createElement, StrictMode, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { DEFAULT_SESSION_CONFIG } from '../sessionMachine';
import { useFocusSession } from '../useFocusSession';
import { SAMPLE_INTERVAL_MS } from '../deskDetector';

type Measurement = { x: number; y: number; z: number; timestamp: number };

// jest.mock fabrikası yalnızca "mock" önekli değişkenlere erişebilir.
let mockListener: ((m: Measurement) => void) | null = null;
let mockAvailable = true;
let mockAppActive = true;
const mockCalls = { setUpdateInterval: [] as number[], removed: 0 };

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    isAvailableAsync: () => Promise.resolve(mockAvailable),
    setUpdateInterval: (ms: number) => {
      mockCalls.setUpdateInterval.push(ms);
    },
    addListener: (fn: (m: Measurement) => void) => {
      mockListener = fn;
      return {
        remove: () => {
          mockCalls.removed += 1;
          if (mockListener === fn) mockListener = null;
        },
      };
    },
  },
}));

jest.mock('../../hooks/useAppActive', () => ({ useAppActive: () => mockAppActive }));

// Test ortamı iOS: ham veri zaten normalize kuralda (yüzü yukarı z = -1).
const FACE_UP = { x: 0, y: 0, z: -1 };
const UPRIGHT = { x: 0, y: -1, z: 0 };

/** durationMs boyunca her SAMPLE_INTERVAL_MS'de sahte sensör örneği basar ve saati ilerletir. */
function feed(v: { x: number; y: number; z: number }, durationMs: number) {
  const steps = Math.round(durationMs / SAMPLE_INTERVAL_MS);
  for (let i = 0; i < steps; i++) {
    act(() => {
      jest.advanceTimersByTime(SAMPLE_INTERVAL_MS);
      mockListener?.({ ...v, timestamp: Date.now() / 1000 });
    });
  }
}

async function flushAvailability() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(1_700_000_000_000);
  mockListener = null;
  mockAvailable = true;
  mockAppActive = true;
  mockCalls.setUpdateInterval = [];
  mockCalls.removed = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useFocusSession', () => {
  it('başlat → masaya koy → süre dolar → onCompleted tam bir kez', async () => {
    const onCompleted = jest.fn();
    const { result } = renderHook(() => useFocusSession({ mode: 'flexible', onCompleted }));
    await flushAvailability();

    expect(result.current.phase).toBe('idle');
    expect(result.current.available).toBe(true);
    expect(mockListener).toBeNull(); // idle iken dinlemez

    act(() => result.current.start(1));
    expect(result.current.phase).toBe('waiting');
    expect(mockListener).not.toBeNull();
    expect(mockCalls.setUpdateInterval).toEqual([SAMPLE_INTERVAL_MS]);

    feed(FACE_UP, 4000);
    expect(result.current.reading.onDesk).toBe(true);
    expect(result.current.phase).toBe('focusing');

    feed(FACE_UP, 30_000);
    expect(result.current.remainingMs).toBeGreaterThan(0);
    expect(result.current.remainingMs).toBeLessThan(60_000);

    feed(FACE_UP, 31_000);
    expect(result.current.phase).toBe('completed');
    expect(result.current.remainingMs).toBe(0);
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(onCompleted.mock.calls[0][0]).toMatchObject({
      completed: true,
      focusedMs: 60_000,
      plannedMs: 60_000,
      pickups: 0,
      focusQuality: 100,
      mode: 'flexible',
    });

    // Oturum bitince sensör bırakılır ve geri çağrı tekrar etmez.
    expect(mockListener).toBeNull();
    act(() => jest.advanceTimersByTime(10_000));
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('tolerans aşılan kaldırma → mola → limit aşılınca onBreakOverdue mola başına bir kez', async () => {
    const onBreakOverdue = jest.fn();
    const { result } = renderHook(() => useFocusSession({ mode: 'flexible', onBreakOverdue }));
    await flushAvailability();

    act(() => result.current.start(25));
    feed(FACE_UP, 4000);
    expect(result.current.phase).toBe('focusing');

    feed(UPRIGHT, 1000);
    expect(result.current.phase).toBe('glancing');

    feed(UPRIGHT, DEFAULT_SESSION_CONFIG.glanceGraceMs);
    expect(result.current.phase).toBe('break');
    expect(onBreakOverdue).not.toHaveBeenCalled();

    // Sensör sessizken bile tikler molayı ilerletir.
    act(() => jest.advanceTimersByTime(DEFAULT_SESSION_CONFIG.breakLimitMs));
    expect(result.current.breakElapsedMs).toBeGreaterThanOrEqual(DEFAULT_SESSION_CONFIG.breakLimitMs);
    expect(onBreakOverdue).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(60_000));
    expect(onBreakOverdue).toHaveBeenCalledTimes(1);

    // Masaya dönüş molayı kapatır; ikinci mola yeniden uyarır.
    feed(FACE_UP, 4000);
    expect(result.current.phase).toBe('focusing');
    expect(result.current.state.breaks).toBe(1);
    expect(result.current.state.breakMs).toBeGreaterThan(DEFAULT_SESSION_CONFIG.breakLimitMs);

    feed(UPRIGHT, 1000 + DEFAULT_SESSION_CONFIG.glanceGraceMs);
    act(() => jest.advanceTimersByTime(DEFAULT_SESSION_CONFIG.breakLimitMs));
    expect(onBreakOverdue).toHaveBeenCalledTimes(2);
  });

  it('finish() erken bitirir ve onCompleted’i completed=false ile bir kez çağırır', async () => {
    const onCompleted = jest.fn();
    const { result } = renderHook(() => useFocusSession({ mode: 'strict', onCompleted }));
    await flushAvailability();

    act(() => result.current.start(25));
    act(() => result.current.finish());
    act(() => result.current.finish());
    expect(result.current.phase).toBe('completed');
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(onCompleted.mock.calls[0][0]).toMatchObject({ completed: false, mode: 'strict' });

    act(() => result.current.reset());
    expect(result.current.phase).toBe('idle');
  });

  it('uygulama arka plana geçince DESK_OFF gönderilir ve sensör bırakılır', async () => {
    const { result, rerender } = renderHook(() => useFocusSession({ mode: 'flexible' }));
    await flushAvailability();

    act(() => result.current.start(25));
    feed(FACE_UP, 4000);
    expect(result.current.phase).toBe('focusing');

    mockAppActive = false;
    rerender({});
    expect(result.current.phase).toBe('glancing');
    expect(result.current.state.pickups).toBe(1);
    expect(mockListener).toBeNull();
  });

  it('sensör yoksa simulateDesk okumayı sürer', async () => {
    mockAvailable = false;
    const { result } = renderHook(() => useFocusSession({ mode: 'strict' }));
    await flushAvailability();
    expect(result.current.available).toBe(false);

    act(() => result.current.simulateDesk(true)); // idle iken etkisiz
    expect(result.current.reading.onDesk).toBe(false);

    act(() => result.current.start(25));
    act(() => result.current.simulateDesk(true));
    expect(result.current.reading).toEqual({ onDesk: true, orientation: 'faceDown', still: true });
    expect(result.current.phase).toBe('focusing');

    act(() => result.current.simulateDesk(false));
    expect(result.current.phase).toBe('glancing');
  });

  it('StrictMode’da onCompleted yine tam bir kez çağrılır', async () => {
    const onCompleted = jest.fn();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children);
    const { result } = renderHook(() => useFocusSession({ mode: 'flexible', onCompleted }), { wrapper });
    await flushAvailability();

    act(() => result.current.start(1));
    feed(FACE_UP, 64_000);
    expect(result.current.phase).toBe('completed');
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });
});
