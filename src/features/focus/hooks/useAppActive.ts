import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Uygulama arka plana gecince (baska uygulama, ekrani kilitleme) odak durur; sensor yalnizca on plandayken okunur.
export function useAppActive() {
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  return appActive;
}
