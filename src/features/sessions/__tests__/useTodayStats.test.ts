import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';
import { Platform } from 'react-native';
import { logger } from '@/src/lib/logger';
import { sessionEvents } from '../events';
import { clearAllSessions, resetSessionStoreForTests, saveSession } from '../repository';
import type { NewFocusSessionRecord } from '../types';
import { useTodayStats } from '../useTodayStats';

// useFocusEffect: testte ekran hep odakta; callback değişince yeniden çalışır.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: jest.fn((cb: () => void | (() => void)) => {
      useEffect(() => cb(), [cb]);
    }),
  };
});

const MIN = 60_000;

const rec = (focusedMs: number, pickups = 0): NewFocusSessionRecord => {
  const now = Date.now();
  return {
    startedAt: now,
    endedAt: now + focusedMs,
    plannedMs: 25 * MIN,
    focusedMs,
    glanceMs: 0,
    breakMs: 0,
    pickups,
    breaks: 0,
    mode: 'flexible',
    completed: true,
    focusQuality: 100,
    roomName: null,
  };
};

beforeEach(async () => {
  // Gerçek depo, AsyncStorage yedeği üzerinden (web yolu).
  jest.replaceProperty(Platform, 'OS', 'web');
  resetSessionStoreForTests();
  await AsyncStorage.clear();
  jest.spyOn(logger, 'info').mockImplementation(() => undefined);
});

describe('useTodayStats', () => {
  it('mount\'ta yükler; kayıt yoksa sıfır döner', async () => {
    const { result } = renderHook(() => useTodayStats());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ focusedMinutes: 0, sessions: 0, pickups: 0 });
    expect(useFocusEffect).toHaveBeenCalled();
  });

  it('mevcut kayıtları okur ve dakikayı aşağı yuvarlar', async () => {
    await saveSession(rec(25 * MIN + 59_999, 2));
    const { result } = renderHook(() => useTodayStats());
    await waitFor(() => expect(result.current.sessions).toBe(1));
    expect(result.current.focusedMinutes).toBe(25);
    expect(result.current.pickups).toBe(2);
  });

  it('saveSession sonrası kendiliğinden yenilenir', async () => {
    const { result } = renderHook(() => useTodayStats());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await saveSession(rec(30 * MIN, 1));
    });
    await waitFor(() => expect(result.current.focusedMinutes).toBe(30));

    await act(async () => {
      await saveSession(rec(10 * MIN, 2));
    });
    await waitFor(() => expect(result.current.focusedMinutes).toBe(40));
    expect(result.current.sessions).toBe(2);
    expect(result.current.pickups).toBe(3);
  });

  it('clearAllSessions sonrası sıfırlanır; refresh elle çağrılabilir', async () => {
    await saveSession(rec(15 * MIN));
    const { result } = renderHook(() => useTodayStats());
    await waitFor(() => expect(result.current.focusedMinutes).toBe(15));

    await act(async () => {
      await clearAllSessions();
    });
    await waitFor(() => expect(result.current.focusedMinutes).toBe(0));

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.sessions).toBe(0);
  });

  it('unmount sonrası olaylara abone kalmaz', async () => {
    const { result, unmount } = renderHook(() => useTodayStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(sessionEvents.listenerCount()).toBe(1);
    unmount();
    expect(sessionEvents.listenerCount()).toBe(0);
    await expect(saveSession(rec(5 * MIN))).resolves.toBe(1);
  });
});
