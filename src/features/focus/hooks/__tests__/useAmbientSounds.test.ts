import { act, renderHook } from '@testing-library/react-native';
import { SOUNDS, SOUND_PACK_PRESETS } from '../../constants';
import { FADE_DURATION_MS, useAmbientSounds } from '../useAmbientSounds';

// ── expo-audio sahtesi ──
// jest.fn yerine düz fonksiyon: restoreMocks uygulamaları sıfırlamasın.
type MockPlayer = {
  source: unknown;
  loop: boolean;
  volume: number;
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
};
const mockPlayers: MockPlayer[] = [];
const mockAudioModeCalls: unknown[] = [];

jest.mock('expo-audio', () => ({
  createAudioPlayer: (source: unknown) => {
    const player: MockPlayer = {
      source,
      loop: false,
      volume: 1,
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
    };
    mockPlayers.push(player);
    return player;
  },
  setAudioModeAsync: (mode: unknown) => {
    mockAudioModeCalls.push(mode);
    return Promise.resolve();
  },
}));

type Props = Parameters<typeof useAmbientSounds>[0];
const baseProps: Props = { isEliteRoom: false, equippedSoundPack: 'classic', isAtDesk: false, isFocused: true };

const setup = (props: Partial<Props> = {}) =>
  renderHook((p: Props) => useAmbientSounds(p), { initialProps: { ...baseProps, ...props } });

// Yükleme döngüsünü (ses modu + her oynatıcı arası setTimeout(0)) bitir.
const flushLoad = () => act(async () => { await jest.advanceTimersByTimeAsync(20); });
const advance = (ms: number) => act(async () => { await jest.advanceTimersByTimeAsync(ms); });

const livePlayers = () => mockPlayers.filter(p => p.remove.mock.calls.length === 0);

// Testte tüm ses varlıkları aynı kimliğe dönüşür; oynatıcılar sırayla
// (availableSounds sırası) oluşturulduğu için anahtardan sıraya gideriz.
type HookResult = { current: ReturnType<typeof useAmbientSounds> };
const playerFor = (result: HookResult, key: string) => {
  const idx = result.current.availableSounds.findIndex(s => s.key === key);
  const live = livePlayers();
  expect(live).toHaveLength(result.current.availableSounds.length);
  return live[idx];
};

beforeEach(() => {
  jest.useFakeTimers();
  mockPlayers.length = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useAmbientSounds', () => {
  it('ses modunu bir kez ayarlar ve her ses için sessiz, döngülü bir oynatıcı oluşturur', async () => {
    const { result, rerender } = setup();
    await flushLoad();

    expect(mockAudioModeCalls).toHaveLength(1);
    expect(mockAudioModeCalls[0]).toEqual({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'mixWithOthers',
    });

    expect(mockPlayers.map(p => p.source)).toEqual(SOUNDS.map(s => s.file));
    expect(mockPlayers).toHaveLength(SOUNDS.length);
    mockPlayers.forEach(p => {
      expect(p.loop).toBe(true);
      expect(p.volume).toBe(0);
      expect(p.play).not.toHaveBeenCalled();
    });

    // Ses açık ama masada değil: çalmaz.
    act(() => result.current.setIsSoundOn(true));
    await advance(FADE_DURATION_MS);
    expect(mockPlayers.some(p => p.play.mock.calls.length > 0)).toBe(false);

    // Masaya bırakıldı: yalnızca seçili ses yumuşakça açılır.
    rerender({ ...baseProps, isAtDesk: true });
    const lib = playerFor(result, 'library');
    expect(lib.play).toHaveBeenCalledTimes(1);
    expect(lib.volume).toBe(0);
    await advance(FADE_DURATION_MS / 2);
    expect(lib.volume).toBeGreaterThan(0.3);
    expect(lib.volume).toBeLessThan(0.7);
    await advance(FADE_DURATION_MS);
    expect(lib.volume).toBe(1);
    expect(playerFor(result, 'rain').play).not.toHaveBeenCalled();

    // Yeni bir yükleme olmadıkça ses modu tekrar ayarlanmaz.
    rerender({ ...baseProps, isAtDesk: false });
    expect(mockAudioModeCalls).toHaveLength(1);
  });

  it('yükleme, istenen duruma göre bittiğinde oynatmayı senkronlar', async () => {
    const { result } = setup({ isAtDesk: true });
    act(() => result.current.setIsSoundOn(true));
    // Yükleme henüz bitmeden istek verildi; bitince açılmalı.
    await flushLoad();
    await advance(FADE_DURATION_MS + 50);
    const lib = playerFor(result, 'library');
    expect(lib.play).toHaveBeenCalledTimes(1);
    expect(lib.volume).toBe(1);
  });

  it('telefon kaldırılınca sesi yumuşakça kısar ve sonra duraklatır', async () => {
    const { result, rerender } = setup({ isAtDesk: true });
    await flushLoad();
    act(() => result.current.setIsSoundOn(true));
    await advance(FADE_DURATION_MS + 50);
    const lib = playerFor(result, 'library');
    expect(lib.volume).toBe(1);

    rerender({ ...baseProps, isAtDesk: false });
    expect(lib.pause).not.toHaveBeenCalled();
    await advance(FADE_DURATION_MS / 2);
    expect(lib.volume).toBeGreaterThan(0);
    expect(lib.volume).toBeLessThan(1);
    expect(lib.pause).not.toHaveBeenCalled();
    await advance(FADE_DURATION_MS);
    expect(lib.volume).toBe(0);
    expect(lib.pause).toHaveBeenCalledTimes(1);
  });

  it('yeni bir geçiş süren fade’i iptal eder ve mevcut seviyeden devam eder', async () => {
    const { result, rerender } = setup({ isAtDesk: true });
    await flushLoad();
    act(() => result.current.setIsSoundOn(true));
    await advance(FADE_DURATION_MS / 2);
    const lib = playerFor(result, 'library');
    const mid = lib.volume;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);

    // Açılış yarıdayken kaldırıldı: yükselmeye devam etmez, aşağı iner.
    rerender({ ...baseProps, isAtDesk: false });
    await advance(100);
    expect(lib.volume).toBeLessThan(mid);
    await advance(FADE_DURATION_MS);
    expect(lib.volume).toBe(0);
    expect(lib.pause).toHaveBeenCalledTimes(1);
    expect(lib.play).toHaveBeenCalledTimes(1);
  });

  it('ekran odaktan çıkınca fade beklemeden hemen duraklatır', async () => {
    const { result, rerender } = setup({ isAtDesk: true });
    await flushLoad();
    act(() => result.current.setIsSoundOn(true));
    await advance(FADE_DURATION_MS + 50);
    const lib = playerFor(result, 'library');

    rerender({ ...baseProps, isAtDesk: true, isFocused: false });
    expect(lib.pause).toHaveBeenCalledTimes(1);
    expect(lib.volume).toBe(0);
  });

  it('paket değişince eski oynatıcıları bırakır', async () => {
    const { rerender, result } = setup();
    await flushLoad();
    const oldPlayers = [...mockPlayers];
    expect(oldPlayers).toHaveLength(4);

    rerender({ ...baseProps, equippedSoundPack: 'rainy' });
    oldPlayers.forEach(p => expect(p.remove).toHaveBeenCalledTimes(1));
    await flushLoad();

    expect(livePlayers()).toHaveLength(SOUND_PACK_PRESETS.rainy.length);
    expect(mockPlayers).toHaveLength(4 + SOUND_PACK_PRESETS.rainy.length);
    expect(result.current.availableSounds).toBe(SOUND_PACK_PRESETS.rainy);
    expect(result.current.volumes).toEqual({ rain: 1 });
  });

  it('eski paketin yarım kalan yüklemesi yeni pakete sızmaz', async () => {
    const { result, rerender } = setup({ isAtDesk: true });
    // Yalnızca ses modu çözülsün: ilk oynatıcı oluşur, gerisi setTimeout bekler.
    await act(async () => {});
    expect(mockPlayers).toHaveLength(1);
    const staleFirst = mockPlayers[0];

    rerender({ ...baseProps, isAtDesk: true, equippedSoundPack: 'fireplace' });
    await flushLoad();

    // Eski kuşak bırakıldı ve devamını oluşturmadı.
    expect(staleFirst.remove).toHaveBeenCalledTimes(1);
    expect(mockPlayers).toHaveLength(1 + SOUND_PACK_PRESETS.fireplace.length);
    expect(livePlayers()).toHaveLength(SOUND_PACK_PRESETS.fireplace.length);
    expect(livePlayers()).not.toContain(staleFirst);

    act(() => result.current.setIsSoundOn(true));
    await advance(FADE_DURATION_MS + 50);
    expect(staleFirst.play).not.toHaveBeenCalled();
    expect(livePlayers()).toHaveLength(2);
    expect(playerFor(result, 'fire').volume).toBe(1);
    expect(playerFor(result, 'fire').play).toHaveBeenCalledTimes(1);
  });

  it('unmount olunca tüm oynatıcıları bırakır ve fade’i durdurur', async () => {
    const { result, unmount } = setup({ isAtDesk: true });
    await flushLoad();
    act(() => result.current.setIsSoundOn(true));
    await advance(FADE_DURATION_MS / 3);
    const lib = playerFor(result, 'library');
    const volumeAtUnmount = lib.volume;

    unmount();
    mockPlayers.forEach(p => expect(p.remove).toHaveBeenCalledTimes(1));
    await advance(FADE_DURATION_MS * 2);
    expect(lib.volume).toBe(volumeAtUnmount);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('mikser kanal seslerini uygular ve fade hedef sesi korur', async () => {
    const { result, rerender } = setup({ isAtDesk: true });
    await flushLoad();
    act(() => result.current.setIsSoundOn(true));
    await advance(FADE_DURATION_MS + 50);
    const lib = playerFor(result, 'library');
    const rainPlayer = playerFor(result, 'rain');

    // Geçiş değil: anında uygulanır.
    act(() => result.current.updateMixerVolume('rain', 0.4));
    expect(rainPlayer.play).toHaveBeenCalledTimes(1);
    expect(rainPlayer.volume).toBe(0.4);
    expect(lib.volume).toBe(1);

    // Kaldır + bırak: her kanal kendi hedefine döner.
    rerender({ ...baseProps, isAtDesk: false });
    await advance(FADE_DURATION_MS + 50);
    expect(rainPlayer.pause).toHaveBeenCalledTimes(1);
    rerender({ ...baseProps, isAtDesk: true });
    await advance(FADE_DURATION_MS / 2);
    expect(rainPlayer.volume).toBeLessThan(0.4);
    await advance(FADE_DURATION_MS);
    expect(rainPlayer.volume).toBe(0.4);
    expect(lib.volume).toBe(1);

    // Kanal 0'a çekilince duraklatılır.
    act(() => result.current.updateMixerVolume('library', 0));
    expect(lib.volume).toBe(0);
    expect(lib.pause).toHaveBeenCalledTimes(2);

    // Tekli seçim: yalnızca seçilen ses çalar.
    act(() => result.current.handleSingleSoundSelect('fire'));
    const firePlayer = playerFor(result, 'fire');
    expect(firePlayer.volume).toBe(1);
    expect(firePlayer.play).toHaveBeenCalledTimes(1);
    expect(rainPlayer.volume).toBe(0);
    expect(result.current.volumes).toEqual({ library: 0, rain: 0, forest: 0, fire: 1 });
  });

  it('Elite odada Derin Odak sesini listenin başına ekler', () => {
    const { result } = setup({ isEliteRoom: true });
    expect(result.current.availableSounds[0].key).toBe('deep_focus');
    expect(result.current.availableSounds).toHaveLength(SOUNDS.length + 1);
    expect(result.current.volumes).toEqual({ deep_focus: 1 });
  });
});
