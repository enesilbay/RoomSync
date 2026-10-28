import { Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import * as Brightness from 'expo-brightness';
import * as KeepAwake from 'expo-keep-awake';
import { useFocusBrightness } from '../../hooks/useFocusBrightness';

jest.mock('expo-brightness', () => ({
  getBrightnessAsync: jest.fn(),
  setBrightnessAsync: jest.fn(),
  isUsingSystemBrightnessAsync: jest.fn(),
  restoreSystemBrightnessAsync: jest.fn(),
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

const mocked = {
  get: Brightness.getBrightnessAsync as jest.MockedFunction<typeof Brightness.getBrightnessAsync>,
  set: Brightness.setBrightnessAsync as jest.MockedFunction<typeof Brightness.setBrightnessAsync>,
  usingSystem: Brightness.isUsingSystemBrightnessAsync as jest.MockedFunction<
    typeof Brightness.isUsingSystemBrightnessAsync
  >,
  restoreSystem: Brightness.restoreSystemBrightnessAsync as jest.MockedFunction<
    typeof Brightness.restoreSystemBrightnessAsync
  >,
  activate: KeepAwake.activateKeepAwakeAsync as jest.MockedFunction<typeof KeepAwake.activateKeepAwakeAsync>,
  deactivate: KeepAwake.deactivateKeepAwake as jest.MockedFunction<typeof KeepAwake.deactivateKeepAwake>,
};

/** Dışarıdan çözülebilen promise: yarışları adım adım kurmak için. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

/** Ekranın şu anki (son ayarlanan) parlaklığı. */
const lastSet = () => mocked.set.mock.calls.at(-1)?.[0];

type Props = { keepAwake: boolean; dim: boolean };
const render = (initial: Props) =>
  renderHook((p: Props) => useFocusBrightness(p), { initialProps: initial });

beforeEach(() => {
  mocked.get.mockResolvedValue(0.7);
  mocked.set.mockResolvedValue(undefined);
  mocked.usingSystem.mockResolvedValue(false);
  mocked.restoreSystem.mockResolvedValue(undefined);
  mocked.activate.mockResolvedValue(undefined);
  mocked.deactivate.mockResolvedValue(undefined);
});

describe('useFocusBrightness', () => {
  it('dim iken 0’a karartır, kapanınca kaydedilen değere döner', async () => {
    const { result, rerender } = await render({ keepAwake: true, dim: true });
    await flush();
    expect(lastSet()).toBe(0);
    expect(result.current).toBe(true);

    await rerender({ keepAwake: true, dim: false });
    await flush();
    expect(lastSet()).toBe(0.7);
    expect(result.current).toBe(false);
  });

  it('YARIŞ: getBrightness beklerken dim kapanırsa ekran 0’da kalmaz', async () => {
    const pending = deferred<number>();
    mocked.get.mockReturnValueOnce(pending.promise);

    const { result, rerender } = await render({ keepAwake: true, dim: true });
    await flush();
    await rerender({ keepAwake: true, dim: false });
    await flush();

    pending.resolve(0.7);
    await flush();
    expect(mocked.set).not.toHaveBeenCalledWith(0);
    expect(result.current).toBe(false);
  });

  it('YARIŞ: setBrightness(0) beklerken dim kapanırsa sonunda geri yüklenir', async () => {
    const pending = deferred<void>();
    mocked.set.mockReturnValueOnce(pending.promise);

    const { rerender } = await render({ keepAwake: true, dim: true });
    await flush();
    expect(lastSet()).toBe(0);
    await rerender({ keepAwake: true, dim: false });
    await flush();

    pending.resolve();
    await flush();
    expect(lastSet()).toBe(0.7);
  });

  it('YARIŞ: açık/kapalı/açık hızlı geçişte orijinal bir kez okunur ve son istek uygulanır', async () => {
    const pending = deferred<number>();
    mocked.get.mockReturnValueOnce(pending.promise);

    const { rerender } = await render({ keepAwake: true, dim: true });
    await rerender({ keepAwake: true, dim: false });
    await rerender({ keepAwake: true, dim: true });
    pending.resolve(0.7);
    await flush();
    expect(mocked.get).toHaveBeenCalledTimes(1);
    expect(lastSet()).toBe(0);

    await rerender({ keepAwake: true, dim: false });
    await flush();
    expect(lastSet()).toBe(0.7);
  });

  it('unmount’ta her zaman geri yükler', async () => {
    const { unmount } = await render({ keepAwake: true, dim: true });
    await flush();
    expect(lastSet()).toBe(0);
    await unmount();
    await flush();
    expect(lastSet()).toBe(0.7);
  });

  it('Android’de pencere sistem parlaklığını izliyorsa restoreSystemBrightnessAsync kullanır', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mocked.usingSystem.mockResolvedValue(true);

    const { rerender } = await render({ keepAwake: true, dim: true });
    await flush();
    expect(lastSet()).toBe(0);
    expect(mocked.get).not.toHaveBeenCalled();

    await rerender({ keepAwake: true, dim: false });
    await flush();
    expect(mocked.restoreSystem).toHaveBeenCalledTimes(1);
    expect(mocked.set).toHaveBeenCalledTimes(1);
  });

  it('iOS’ta orijinal okunamazsa hiç karartmaz', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mocked.get.mockRejectedValueOnce(new Error('yok'));
    const { result } = await render({ keepAwake: true, dim: true });
    await flush();
    expect(mocked.set).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it('keepAwake etiketiyle açılır ve kapanır', async () => {
    const { rerender } = await render({ keepAwake: true, dim: false });
    expect(mocked.activate).toHaveBeenCalledWith('roomsync-focus');
    await rerender({ keepAwake: false, dim: false });
    expect(mocked.deactivate).toHaveBeenCalledWith('roomsync-focus');
    await flush();
  });
});
