import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SAMPLE_INTERVAL_MS } from '../engine/deskDetector';
import SoloFocusScreen from '../SoloFocusScreen';

// jest.mock fabrikaları yalnızca "mock" önekli değişkenlere erişebilir.
// Düz fonksiyonlar kullanılır: restoreMocks uygulamaları sıfırlamasın.
type Measurement = { x: number; y: number; z: number; timestamp: number };
let mockListener: ((m: Measurement) => void) | null = null;
const mockSaved: unknown[] = [];
const mockHaptics: string[] = [];
const mockPlayers: { listened: boolean; played: boolean; removed: boolean }[] = [];
const mockNetwork: string[] = [];

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    isAvailableAsync: () => Promise.resolve(true),
    setUpdateInterval: () => undefined,
    addListener: (fn: (m: Measurement) => void) => {
      mockListener = fn;
      return {
        remove: () => {
          if (mockListener === fn) mockListener = null;
        },
      };
    },
  },
}));

jest.mock('../hooks/useAppActive', () => ({ useAppActive: () => true }));

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useIsFocused: () => true,
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: () => {
    const p = { listened: false, played: false, removed: false };
    mockPlayers.push(p);
    return {
      loop: false,
      volume: 0,
      play: () => {
        p.played = true;
      },
      pause: () => undefined,
      remove: () => {
        p.removed = true;
      },
      addListener: () => {
        p.listened = true;
        return { remove: () => undefined };
      },
    };
  },
  setAudioModeAsync: () => Promise.resolve(),
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  impactAsync: (style: string) => {
    mockHaptics.push(`impact:${style}`);
    return Promise.resolve();
  },
  notificationAsync: (type: string) => {
    mockHaptics.push(`notification:${type}`);
    return Promise.resolve();
  },
}));

jest.mock('expo-battery', () => ({
  BatteryState: { UNKNOWN: 0, UNPLUGGED: 1, CHARGING: 2, FULL: 3 },
  isAvailableAsync: () => Promise.resolve(true),
  getBatteryStateAsync: () => Promise.resolve(1),
  addBatteryStateListener: () => ({ remove: () => undefined }),
}));

jest.mock('expo-brightness', () => ({
  getBrightnessAsync: () => Promise.resolve(0.6),
  setBrightnessAsync: () => Promise.resolve(),
  isUsingSystemBrightnessAsync: () => Promise.resolve(false),
  restoreSystemBrightnessAsync: () => Promise.resolve(),
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: () => Promise.resolve(),
  deactivateKeepAwake: () => Promise.resolve(),
}));

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: () => Promise.resolve({ status: 'denied' }),
  scheduleNotificationAsync: () => Promise.resolve('id'),
  cancelScheduledNotificationAsync: () => Promise.resolve(),
}));

jest.mock('@/src/features/sessions', () => ({
  saveSession: (rec: unknown) => {
    mockSaved.push(rec);
    return Promise.resolve(1);
  },
  useTodayStats: () => ({ focusedMinutes: 42, sessions: 2, pickups: 5, loading: false, refresh: () => Promise.resolve() }),
}));

// Test ortamı iOS: yüzü yukarı düz telefon z = -1.
const FACE_UP = { x: 0, y: 0, z: -1 };
const UPRIGHT = { x: 0, y: -1, z: 0 };

async function feed(v: { x: number; y: number; z: number }, durationMs: number) {
  const steps = Math.round(durationMs / SAMPLE_INTERVAL_MS);
  for (let i = 0; i < steps; i++) {
    await act(() => {
      jest.advanceTimersByTime(SAMPLE_INTERVAL_MS);
      mockListener?.({ ...v, timestamp: Date.now() / 1000 });
    });
  }
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

async function renderAndStart(minutes: number) {
  await render(<SoloFocusScreen />);
  await flush();
  await fireEvent.press(screen.getByRole('radio', { name: `${minutes} dakika` }));
  await fireEvent.press(screen.getByRole('button', { name: 'Başlat' }));
  await flush();
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(1_700_000_000_000);
  mockListener = null;
  mockSaved.length = 0;
  mockHaptics.length = 0;
  mockPlayers.length = 0;
  mockNetwork.length = 0;
  globalThis.fetch = jest.fn(() => {
    mockNetwork.push('fetch');
    return Promise.reject(new Error('ağ yok'));
  }) as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SoloFocusScreen', () => {
  it('başlat → masaya koy → odak → bitir: özet açılır ve oturum roomName: null ile kaydedilir', async () => {
    await renderAndStart(25);

    expect(screen.getByLabelText('Bugün 42 dk odak')).toBeTruthy();
    expect(screen.getByText('Telefonu masaya düz bırak')).toBeTruthy();
    expect(mockHaptics).toContain('impact:light');

    await feed(FACE_UP, 4000);
    expect(screen.getAllByText('Odaklanıyorsun').length).toBeGreaterThan(0);
    // Esnek mod, yüz yukarı: OLED minimal katman açık.
    expect(screen.getByTestId('focus-minimal')).toBeTruthy();
    expect(mockHaptics).toContain('notification:success');

    await feed(FACE_UP, 3000);
    await feed(UPRIGHT, 1000);
    expect(screen.getByText('Kısa bakış')).toBeTruthy();
    expect(screen.queryByTestId('focus-minimal')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Bitir' }));
    await fireEvent.press(screen.getByText('Evet, bitir'));
    await flush();

    expect(screen.getAllByText('Erken bitirildi').length).toBeGreaterThan(0);
    expect(mockSaved).toHaveLength(1);
    expect(mockSaved[0]).toMatchObject({ roomName: null, completed: false, plannedMs: 25 * 60_000, pickups: 1 });
    // Erken bitişte zil çalmaz.
    expect(mockPlayers.some((p) => p.listened)).toBe(false);
    // Solo ekran ağa dokunmaz.
    expect(mockNetwork).toHaveLength(0);
  });

  it('süre dolunca tamamlanır: zil çalar, özet "Tamamlandı" ve Yeni oturum boşa döner', async () => {
    await renderAndStart(15);
    await feed(FACE_UP, 3000);
    expect(screen.getAllByText('Odaklanıyorsun').length).toBeGreaterThan(0);

    await act(() => {
      jest.advanceTimersByTime(15 * 60_000);
    });
    await flush();

    expect(screen.getAllByText('Tamamlandı').length).toBeGreaterThan(0);
    expect(mockSaved[0]).toMatchObject({ roomName: null, completed: true, focusedMs: 15 * 60_000 });
    const chime = mockPlayers.find((p) => p.listened);
    expect(chime?.played).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Yeni oturum' }));
    expect(screen.getByText('Hazır')).toBeTruthy();
  });

  it('hiç odaklanmadan Bitir: onay sormadan iptal eder, kayıt yok', async () => {
    await renderAndStart(25);
    await fireEvent.press(screen.getByRole('button', { name: 'Bitir' }));
    await flush();
    expect(screen.queryByText('Evet, bitir')).toBeNull();
    expect(screen.getByText('Hazır')).toBeTruthy();
    expect(mockSaved).toHaveLength(0);
  });

  it('60 dk ve şarjda değilken pil önerisi gösterir; dokununca kapanır', async () => {
    await render(<SoloFocusScreen />);
    await flush();
    const hint = 'Uzun oturumlarda ekran açık kalır; şarja takman iyi olur.';
    expect(screen.queryByText(hint)).toBeNull();

    await fireEvent.press(screen.getByRole('radio', { name: '60 dakika' }));
    expect(screen.getByText(hint)).toBeTruthy();
    await fireEvent.press(screen.getByText(hint));
    expect(screen.queryByText(hint)).toBeNull();
  });
});
