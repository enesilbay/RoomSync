import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  DEFAULT_FOCUS_PREFERENCES,
  FOCUS_PREFERENCES_KEY,
  parseFocusPreferences,
  useFocusPreferences,
} from '../useFocusPreferences';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('parseFocusPreferences', () => {
  it('boş, bozuk veya tanınmayan değerde varsayılana döner', () => {
    expect(parseFocusPreferences(null)).toEqual(DEFAULT_FOCUS_PREFERENCES);
    expect(parseFocusPreferences('{bozuk')).toEqual(DEFAULT_FOCUS_PREFERENCES);
    expect(parseFocusPreferences('"metin"')).toEqual(DEFAULT_FOCUS_PREFERENCES);
    expect(parseFocusPreferences(JSON.stringify({ mode: 'sert', minutes: 7 }))).toEqual(DEFAULT_FOCUS_PREFERENCES);
  });

  it('geçerli alanları korur', () => {
    expect(parseFocusPreferences(JSON.stringify({ mode: 'strict', minutes: 45 }))).toEqual({ mode: 'strict', minutes: 45 });
  });
});

describe('useFocusPreferences', () => {
  it('varsayılan esnek mod ve 25 dk', async () => {
    const { result } = renderHook(() => useFocusPreferences());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.mode).toBe('flexible');
    expect(result.current.minutes).toBe(25);
  });

  it('seçimi kaydeder ve yeni mount kayıttan okur', async () => {
    const first = renderHook(() => useFocusPreferences());
    await waitFor(() => expect(first.result.current.loaded).toBe(true));

    act(() => first.result.current.setMode('strict'));
    act(() => first.result.current.setMinutes(60));
    expect(first.result.current.mode).toBe('strict');
    expect(first.result.current.minutes).toBe(60);
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(FOCUS_PREFERENCES_KEY)) ?? 'null')).toEqual({
        mode: 'strict',
        minutes: 60,
      }),
    );
    first.unmount();

    const second = renderHook(() => useFocusPreferences());
    await waitFor(() => expect(second.result.current.loaded).toBe(true));
    expect(second.result.current.mode).toBe('strict');
    expect(second.result.current.minutes).toBe(60);
  });

  it('yükleme bitmeden yapılan seçim diskteki eski değerle ezilmez', async () => {
    await AsyncStorage.setItem(FOCUS_PREFERENCES_KEY, JSON.stringify({ mode: 'strict', minutes: 15 }));
    const { result } = renderHook(() => useFocusPreferences());
    act(() => result.current.setMode('flexible'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.mode).toBe('flexible');
  });
});
