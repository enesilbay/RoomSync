import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from '@/src/lib/api';
import { logger } from '@/src/lib/logger';
import type { Friend } from '../types';

// Odaya davet edilebilecek çevrimiçi arkadaşlar.
export function useOnlineFriends() {
  const [onlineFriends, setOnlineFriends] = useState<Friend[]>([]);

  const fetchOnlineFriends = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/users/friends/0'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setOnlineFriends((Array.isArray(data) ? data : []).filter((friend: Friend) => friend.isOnline));
    } catch {
      logger.debug('Online arkadaşlar yüklenemedi');
    }
  }, []);

  return { onlineFriends, fetchOnlineFriends };
}
