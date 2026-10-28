import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Hidrasyon bayrağı değişmez; abone olunacak bir kaynak yok.
const subscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // Sunucu/hidrasyon render'ında false, istemcide true (effect içinde setState yerine).
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
