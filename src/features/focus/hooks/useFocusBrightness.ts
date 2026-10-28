import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Brightness from 'expo-brightness';
import { logger } from '@/src/lib/logger';

type Options = {
  isFocused: boolean;
  focusRequested: boolean;
  isAtDesk: boolean;
  isPhoneFaceDownOnDesk: boolean;
};

// Odak sırasında ekranı uyanık tutar; telefon ters çevrilip masadayken ekranı karartır.
export function useFocusBrightness({ isFocused, focusRequested, isAtDesk, isPhoneFaceDownOnDesk }: Options) {
  const [focusScreenDimmed, setFocusScreenDimmed] = useState(false);
  const brightnessBeforeFocusRef = useRef<number | null>(null);

  const restoreFocusBrightness = async () => {
    if (Platform.OS === 'web' || brightnessBeforeFocusRef.current === null) return;

    const brightness = brightnessBeforeFocusRef.current;
    brightnessBeforeFocusRef.current = null;

    try {
      await Brightness.setBrightnessAsync(brightness);
    } catch {
      logger.debug('Parlaklık geri yüklenemedi');
    }
  };

  // Odak modu acikken ekran kendiliginden kilitlenmesin (parlaklik zaten kisiliyor);
  // aksi halde telefon masada dururken uygulama arka plana duser ve odak kesilir.
  useEffect(() => {
    if (Platform.OS === 'web' || !isFocused || !focusRequested) return;
    const tag = 'roomsync-focus';
    activateKeepAwakeAsync(tag).catch(() => undefined);
    return () => {
      deactivateKeepAwake(tag).catch(() => undefined);
    };
  }, [isFocused, focusRequested]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setFocusScreenDimmed(false);
      return;
    }

    let mounted = true;
    const shouldDimScreen = isFocused && isAtDesk && isPhoneFaceDownOnDesk && focusRequested;

    const syncScreenBrightness = async () => {
      if (shouldDimScreen) {
        try {
          if (brightnessBeforeFocusRef.current === null) {
            brightnessBeforeFocusRef.current = await Brightness.getBrightnessAsync();
          }
          await Brightness.setBrightnessAsync(0);
          if (mounted) setFocusScreenDimmed(true);
        } catch {
          logger.debug('Odak ekranı karartılamadı');
        }
      } else {
        if (mounted) setFocusScreenDimmed(false);
        await restoreFocusBrightness();
      }
    };

    syncScreenBrightness();

    return () => {
      mounted = false;
    };
  }, [isFocused, isAtDesk, isPhoneFaceDownOnDesk, focusRequested]);

  useEffect(() => {
    return () => {
      restoreFocusBrightness();
    };
  }, []);

  return focusScreenDimmed;
}
