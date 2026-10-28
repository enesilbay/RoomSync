import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Brightness from 'expo-brightness';
import { logger } from '@/src/lib/logger';

type Options = {
  /** Odak sırasında ekran kendiliğinden kilitlenmesin (kilitlenirse uygulama arka plana düşer). */
  keepAwake: boolean;
  /** Ekranı 0 parlaklığa karart. */
  dim: boolean;
};

const KEEP_AWAKE_TAG = 'roomsync-focus';
const IS_WEB = Platform.OS === 'web';

/** Karartmadan önceki durum: Android'de pencere sistem parlaklığını mı izliyordu, yoksa sabit değer mi. */
type Original = { value: number; usingSystem: boolean };

async function readOriginal(): Promise<Original | null> {
  try {
    if (Platform.OS === 'android' && (await Brightness.isUsingSystemBrightnessAsync())) {
      return { value: -1, usingSystem: true };
    }
    return { value: await Brightness.getBrightnessAsync(), usingSystem: false };
  } catch {
    logger.debug('Parlaklık okunamadı');
    // Android'de sistem parlaklığına dönmek her zaman güvenli; iOS'ta bilinmeyen değere karartma yapılmaz.
    return Platform.OS === 'android' ? { value: -1, usingSystem: true } : null;
  }
}

async function restore(original: Original | null): Promise<void> {
  if (Platform.OS === 'android' && (original === null || original.usingSystem)) {
    await Brightness.restoreSystemBrightnessAsync();
  } else if (original !== null) {
    await Brightness.setBrightnessAsync(original.value);
  }
}

// Odakta ekranı uyanık tutar ve istenince karartır. Eski sürümdeki yarış (getBrightness'ın
// dim kapandıktan sonra çözülüp ekranı 0'da bırakması) şöyle önlenir: tüm parlaklık işlemleri
// tek bir zincirde sırayla çalışır ve her await sonrası güncel istek (wantDimRef) yeniden okunur;
// istenen ile uygulanan eşitlenene kadar döngü sürer. Orijinal değer karartma döngüsü başına bir kez saklanır.
export function useFocusBrightness({ keepAwake, dim }: Options): boolean {
  const [dimApplied, setDimApplied] = useState(false);
  const wantDimRef = useRef(false);
  const appliedRef = useRef(false);
  const originalRef = useRef<Original | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(false);

  useEffect(() => {
    if (IS_WEB || !keepAwake) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [keepAwake]);

  useEffect(() => {
    if (IS_WEB) return;
    mountedRef.current = true;

    const reconcile = async () => {
      for (;;) {
        const want = wantDimRef.current;
        if (want === appliedRef.current) return;
        try {
          if (want) {
            if (originalRef.current === null) {
              const original = await readOriginal();
              if (original === null) return;
              originalRef.current = original;
              continue; // await sonrası istek değişmiş olabilir
            }
            // Hata olsa bile kararmış olabilir; geri yükleme denensin diye önce işaretle.
            appliedRef.current = true;
            await Brightness.setBrightnessAsync(0);
            if (mountedRef.current && wantDimRef.current) setDimApplied(true);
          } else {
            await restore(originalRef.current);
            appliedRef.current = false;
            originalRef.current = null;
          }
        } catch {
          logger.debug(want ? 'Odak ekranı karartılamadı' : 'Parlaklık geri yüklenemedi');
          return; // Sonsuz yeniden denemeye girme; bir sonraki istek değişiminde tekrar denenir.
        }
      }
    };

    wantDimRef.current = dim;
    if (!dim) setDimApplied(false);
    chainRef.current = chainRef.current.then(reconcile);

    return () => {
      // Unmount'ta (ve StrictMode'un sahte unmount'unda) her zaman geri yükle; yeniden mount isteği tekrar uygular.
      mountedRef.current = false;
      wantDimRef.current = false;
      chainRef.current = chainRef.current.then(reconcile);
    };
  }, [dim]);

  return dim && dimApplied;
}
