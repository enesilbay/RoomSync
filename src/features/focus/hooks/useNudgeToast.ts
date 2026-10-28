import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';
import type { NudgeToastState } from '../types';

// Nudge (Dürtme) toast state'leri
export function useNudgeToast() {
  const [nudgeToast, setNudgeToast] = useState<NudgeToastState | null>(null);
  const [nudgeAnim] = useState(() => new Animated.Value(0));
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nudge: Toast animasyonunu göster
  const showNudgeToast = useCallback((senderName: string, message: string) => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    setNudgeToast({ message, senderName });
    Animated.spring(nudgeAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }).start();
    nudgeTimer.current = setTimeout(() => {
      Animated.timing(nudgeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setNudgeToast(null);
      });
    }, 4000);
  }, [nudgeAnim]);

  return { nudgeToast, nudgeAnim, showNudgeToast };
}
