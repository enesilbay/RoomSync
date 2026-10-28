import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from '@/src/lib/api';
import { logger } from '@/src/lib/logger';

// Kullanıcı kimliği, premium durumu ve takılı ses paketi: önce yerel kayıttan, sonra /users/me'den okunur.
export function useUserPreferences(routeUserId: number) {
  const [storedUserId, setStoredUserId] = useState<number | null>(Number.isFinite(routeUserId) ? routeUserId : null);
  const [isPremium, setIsPremium] = useState(false);
  const [equippedSoundPack, setEquippedSoundPack] = useState('classic');

  const checkPremiumStatus = useCallback(async () => {
    const stored = await AsyncStorage.getItem('user_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed.id === 'number') {
        setStoredUserId(parsed.id);
      }
      if (typeof parsed.equippedSoundPack === 'string') {
        setEquippedSoundPack(parsed.equippedSoundPack);
      }
      setIsPremium(parsed.isPremium === true);
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(apiUrl('/users/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        if (typeof data.user.id === 'number') {
          setStoredUserId(data.user.id);
        }
        if (typeof data.user.equippedSoundPack === 'string') {
          setEquippedSoundPack(data.user.equippedSoundPack);
        }
        setIsPremium(data.user.isPremium === true);
      }
    } catch {
      logger.debug('Kullanıcı tercihleri güncellenemedi');
    }
  }, []);

  return { storedUserId, isPremium, equippedSoundPack, checkPremiumStatus };
}
