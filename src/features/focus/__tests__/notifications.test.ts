import { act, renderHook } from '@testing-library/react-native';
import type { SessionPhase } from '../engine/types';
import { useBreakAlert } from '../hooks/useBreakAlert';
import {
  BREAK_ALERT_CONTENT,
  BREAK_ALERT_TYPE,
  cancelBreakAlert,
  decideBreakAlert,
  scheduleBreakAlert,
} from '../notifications';

// ── expo-constants / expo-notifications sahteleri ──
// Düz fonksiyonlar: restoreMocks uygulamaları sıfırlamasın.
let mockEnv = 'bare';
let mockPermission = 'granted';
let mockNextId = 0;
const mockScheduled: { id: string; request: unknown }[] = [];
const mockCancelled: string[] = [];

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get executionEnvironment() {
      return mockEnv;
    },
  },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: () => Promise.resolve({ status: mockPermission }),
  scheduleNotificationAsync: (request: unknown) => {
    const id = `n${++mockNextId}`;
    mockScheduled.push({ id, request });
    return Promise.resolve(id);
  },
  cancelScheduledNotificationAsync: (id: string) => {
    mockCancelled.push(id);
    return Promise.resolve();
  },
}));

const LIMIT = 5 * 60_000;
const T0 = 1_700_000_000_000;

beforeEach(() => {
  mockEnv = 'bare';
  mockPermission = 'granted';
  mockNextId = 0;
  mockScheduled.length = 0;
  mockCancelled.length = 0;
});

describe('decideBreakAlert', () => {
  const base = { leftDeskAt: null, scheduledKey: null, breakLimitMs: LIMIT, now: T0 };

  it('telefon kalkınca (glancing) leftDeskAt + breakLimit anına kurar', () => {
    expect(decideBreakAlert({ ...base, phase: 'glancing', leftDeskAt: T0, now: T0 + 100 })).toEqual({
      type: 'schedule',
      key: T0,
      fireAt: T0 + LIMIT,
    });
  });

  it('aynı kalkış için tekrar kurmaz (glancing → break)', () => {
    expect(decideBreakAlert({ ...base, phase: 'break', leftDeskAt: T0, scheduledKey: T0, now: T0 + 9000 })).toEqual({
      type: 'none',
    });
  });

  it('yeni kalkışta yeniden kurar', () => {
    const d = decideBreakAlert({ ...base, phase: 'glancing', leftDeskAt: T0 + 60_000, scheduledKey: T0, now: T0 + 60_000 });
    expect(d).toEqual({ type: 'schedule', key: T0 + 60_000, fireAt: T0 + 60_000 + LIMIT });
  });

  it.each<SessionPhase>(['focusing', 'completed', 'idle', 'waiting'])('%s fazında kurulu bildirimi iptal eder', (phase) => {
    expect(decideBreakAlert({ ...base, phase, scheduledKey: T0 })).toEqual({ type: 'cancel' });
  });

  it('kurulu bildirim yokken odakta hiçbir şey yapmaz', () => {
    expect(decideBreakAlert({ ...base, phase: 'focusing' })).toEqual({ type: 'none' });
  });

  it('süre zaten geçtiyse kurmaz', () => {
    expect(decideBreakAlert({ ...base, phase: 'break', leftDeskAt: T0, now: T0 + LIMIT + 1 })).toEqual({ type: 'none' });
  });
});

describe('scheduleBreakAlert / cancelBreakAlert', () => {
  it('izin varken DATE tetikleyiciyle kurar ve iptal eder', async () => {
    const id = scheduleBreakAlert(T0 + LIMIT);
    await expect(id).resolves.toBe('n1');
    expect(mockScheduled[0].request).toEqual({
      content: { ...BREAK_ALERT_CONTENT, data: { type: BREAK_ALERT_TYPE } },
      trigger: { type: 'date', date: T0 + LIMIT },
    });
    await cancelBreakAlert(id);
    expect(mockCancelled).toEqual(['n1']);
  });

  it('bildirim metni', () => {
    expect(BREAK_ALERT_CONTENT).toEqual({
      title: 'Mola uzadı',
      body: 'Odaklanmaya dönmek için telefonu masaya bırak',
    });
  });

  it('izin yoksa sessizce hiçbir şey yapmaz (izin istemez)', async () => {
    mockPermission = 'denied';
    const id = scheduleBreakAlert(T0 + LIMIT);
    await expect(id).resolves.toBeNull();
    await cancelBreakAlert(id);
    expect(mockScheduled).toHaveLength(0);
    expect(mockCancelled).toHaveLength(0);
  });

  it("Expo Go'da modülü hiç kullanmaz", async () => {
    mockEnv = 'storeClient';
    await expect(scheduleBreakAlert(T0 + LIMIT)).resolves.toBeNull();
    expect(mockScheduled).toHaveLength(0);
  });
});

describe('useBreakAlert', () => {
  type Props = { phase: SessionPhase; leftDeskAt: number | null };
  const flush = () => act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(T0);
  });
  afterEach(() => jest.useRealTimers());

  it('kalkışta kurar, odak geri gelince iptal eder; ekran kapanınca kalanı iptal eder', async () => {
    const { rerender, unmount } = renderHook((p: Props) => useBreakAlert({ ...p, breakLimitMs: LIMIT }), {
      initialProps: { phase: 'focusing', leftDeskAt: null },
    });
    await flush();
    expect(mockScheduled).toHaveLength(0);

    rerender({ phase: 'glancing', leftDeskAt: T0 });
    await flush();
    expect(mockScheduled).toHaveLength(1);

    rerender({ phase: 'break', leftDeskAt: T0 });
    await flush();
    expect(mockScheduled).toHaveLength(1);

    rerender({ phase: 'focusing', leftDeskAt: null });
    await flush();
    expect(mockCancelled).toEqual(['n1']);

    rerender({ phase: 'glancing', leftDeskAt: T0 + 1000 });
    await flush();
    expect(mockScheduled).toHaveLength(2);
    unmount();
    await flush();
    expect(mockCancelled).toEqual(['n1', 'n2']);
  });

  it('bitişte (completed) iptal eder', async () => {
    const { rerender } = renderHook((p: Props) => useBreakAlert({ ...p, breakLimitMs: LIMIT }), {
      initialProps: { phase: 'glancing', leftDeskAt: T0 },
    });
    await flush();
    rerender({ phase: 'completed', leftDeskAt: null });
    await flush();
    expect(mockCancelled).toEqual(['n1']);
  });
});
