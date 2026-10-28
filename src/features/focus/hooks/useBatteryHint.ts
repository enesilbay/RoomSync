import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Battery from 'expo-battery';
import { logger } from '@/src/lib/logger';
import { LONG_SESSION_MINUTES } from '../constants';

const isPowered = (state: Battery.BatteryState) =>
  state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;

// Uzun oturumda ekran açık kalır: şarjda değilse kibar bir öneri gösterilir. Web'de ve
// pil bilgisi yokken hiçbir şey yapmaz. Kapatılan öneri ekran açık kaldıkça geri gelmez.
export function useBatteryHint(plannedMinutes: number) {
  // null: bilinmiyor (henüz okunmadı ya da desteklenmiyor) → öneri gösterilmez.
  const [powered, setPowered] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    let sub: { remove(): void } | null = null;

    (async () => {
      try {
        if (!(await Battery.isAvailableAsync()) || cancelled) return;
        const state = await Battery.getBatteryStateAsync();
        if (cancelled) return;
        if (state !== Battery.BatteryState.UNKNOWN) setPowered(isPowered(state));
        sub = Battery.addBatteryStateListener(({ batteryState }) => {
          setPowered(batteryState === Battery.BatteryState.UNKNOWN ? null : isPowered(batteryState));
        });
      } catch (err) {
        logger.debug('[focus] pil durumu okunamadı', err);
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  return {
    visible: !dismissed && powered === false && plannedMinutes >= LONG_SESSION_MINUTES,
    dismiss,
  };
}
