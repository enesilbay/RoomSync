import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/src/lib/logger';
import { DEFAULT_FOCUS_MINUTES, FOCUS_DURATIONS } from '../constants';
import type { FocusMode } from '../engine/types';

export const FOCUS_PREFERENCES_KEY = 'focus_preferences';

export type FocusPreferences = { mode: FocusMode; minutes: number };

/** Esnek mod eski davranışa en yakın olanı (iki yönde de masada sayılır). */
export const DEFAULT_FOCUS_PREFERENCES: FocusPreferences = {
  mode: 'flexible',
  minutes: DEFAULT_FOCUS_MINUTES,
};

const isMode = (v: unknown): v is FocusMode => v === 'strict' || v === 'flexible';
const isDuration = (v: unknown): v is number =>
  typeof v === 'number' && (FOCUS_DURATIONS as readonly number[]).includes(v);

/** Bozuk veya eski kayıtta tanınmayan alanlar varsayılana döner. */
export function parseFocusPreferences(raw: string | null): FocusPreferences {
  if (!raw) return DEFAULT_FOCUS_PREFERENCES;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return DEFAULT_FOCUS_PREFERENCES;
    const { mode, minutes } = data as Record<string, unknown>;
    return {
      mode: isMode(mode) ? mode : DEFAULT_FOCUS_PREFERENCES.mode,
      minutes: isDuration(minutes) ? minutes : DEFAULT_FOCUS_PREFERENCES.minutes,
    };
  } catch {
    return DEFAULT_FOCUS_PREFERENCES;
  }
}

// Odak modu ve süre seçimi cihazda saklanır (hesap gerekmez).
export function useFocusPreferences() {
  const [prefs, setPrefs] = useState<FocusPreferences>(DEFAULT_FOCUS_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  // Yükleme bitmeden kullanıcı seçim yaptıysa diskteki eski değer üstüne yazılmasın.
  const touchedRef = useRef(false);
  // Son değer: art arda iki güncelleme birbirini ezmesin, updater içinde yan etki olmasın.
  const prefsRef = useRef(DEFAULT_FOCUS_PREFERENCES);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(FOCUS_PREFERENCES_KEY)
      .then((raw) => {
        if (cancelled || touchedRef.current) return;
        prefsRef.current = parseFocusPreferences(raw);
        setPrefs(prefsRef.current);
      })
      .catch((err: unknown) => logger.warn('[focus] tercihler okunamadı', err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<FocusPreferences>) => {
    touchedRef.current = true;
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    setPrefs(next);
    AsyncStorage.setItem(FOCUS_PREFERENCES_KEY, JSON.stringify(next)).catch((err: unknown) =>
      logger.warn('[focus] tercihler kaydedilemedi', err),
    );
  }, []);

  const setMode = useCallback((mode: FocusMode) => update({ mode }), [update]);
  const setMinutes = useCallback((minutes: number) => update({ minutes }), [update]);

  return { mode: prefs.mode, minutes: prefs.minutes, loaded, setMode, setMinutes };
}
