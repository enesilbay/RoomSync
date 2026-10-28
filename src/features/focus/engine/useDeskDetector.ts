import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { logger } from '@/src/lib/logger';
import { useAppActive } from '../hooks/useAppActive';
import {
  createDeskDetector,
  DEFAULT_DETECTOR_CONFIG,
  IDLE_READING,
  normalizeSample,
  SAMPLE_INTERVAL_MS,
  type SensorPlatform,
} from './deskDetector';
import type { DeskDetectorConfig, DeskReading, FocusMode } from './types';

export type DeskDetectorOverrides = Partial<Omit<DeskDetectorConfig, 'mode'>>;

type Options = {
  enabled: boolean;
  mode: FocusMode;
  /** Değişiklikler bir sonraki etkinleştirmede uygulanır (aboneliği yenilemez). */
  config?: DeskDetectorOverrides;
};

export type DeskDetectorResult = {
  reading: DeskReading;
  /** null: kontrol ediliyor. Web'de her zaman false (web verisi ivme değil). */
  available: boolean | null;
  /** Web'de veya sensör yokken masaya koyma/kaldırmayı taklit eder; sensör çalışırken etkisizdir. */
  simulate(onDesk: boolean): void;
};

const IS_WEB = Platform.OS === 'web';

function currentPlatform(): SensorPlatform {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
}

// İvmeölçeri yalnızca etkin ve uygulama ön plandayken dinler; okuma değişmedikçe render tetiklemez.
export function useDeskDetector({ enabled, mode, config }: Options): DeskDetectorResult {
  const appActive = useAppActive();
  const [available, setAvailable] = useState<boolean | null>(IS_WEB ? false : null);
  const [reading, setReading] = useState<DeskReading>(IDLE_READING);

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  useEffect(() => {
    if (IS_WEB) return;
    let cancelled = false;
    Accelerometer.isAvailableAsync()
      .then((ok) => {
        if (!cancelled) setAvailable(ok);
      })
      .catch(() => {
        logger.debug('İvmeölçer durumu okunamadı');
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const live = enabled && appActive;
  const sensorDriven = !IS_WEB && available === true;

  useEffect(() => {
    if (!live) return;
    let sub: { remove(): void } | null = null;

    if (sensorDriven) {
      const platform = currentPlatform();
      const detector = createDeskDetector({ ...DEFAULT_DETECTOR_CONFIG, ...configRef.current, mode });
      let last = IDLE_READING;
      Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
      sub = Accelerometer.addListener(({ x, y, z, timestamp }) => {
        // Sensör zaman damgası (sn) kullanılır; eksikse son çare olarak duvar saati.
        const t = Number.isFinite(timestamp) ? timestamp * 1000 : Date.now();
        const next = detector.push(normalizeSample({ x, y, z, t }, platform));
        if (next !== last) {
          last = next;
          setReading(next);
        }
      });
    }

    // Kapanınca (veya arka plana geçince) okuma sıfırlanır; eski "masada" değeri sızmasın.
    return () => {
      sub?.remove();
      setReading(IDLE_READING);
    };
  }, [live, sensorDriven, mode]);

  const simulate = useCallback(
    (onDesk: boolean) => {
      if (!live || sensorDriven) return;
      setReading(
        onDesk
          ? { onDesk: true, orientation: mode === 'strict' ? 'faceDown' : 'faceUp', still: true }
          : IDLE_READING,
      );
    },
    [live, sensorDriven, mode],
  );

  // Kapalıyken temizleme effect'i çalışmadan önceki render'da da eski okuma görünmesin.
  return { reading: live ? reading : IDLE_READING, available, simulate };
}
