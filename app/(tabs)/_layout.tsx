import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl, BACKEND_URL } from '@/src/lib/api';
import { C } from '@/src/theme';
import { logger } from '@/src/lib/logger';
import { io, Socket } from 'socket.io-client';
import type { NotificationBehavior } from 'expo-notifications';
import { BREAK_ALERT_TYPE } from '@/src/features/focus/notifications';

// Expo Go (SDK 53+) Android push bildirimlerini desteklemiyor.
// Tüm expo-notifications API'si sadece gerçek build'lerde yükleniyor.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Notifications modülünü yalnızca Expo Go dışında yükle
type NotificationsModule = typeof import('expo-notifications');
type NotificationData = {
  type?: unknown;
  targetUserId?: unknown;
  targetName?: unknown;
  targetUsername?: unknown;
  roomName?: unknown;
};

// AsyncStorage'daki 'user_data' içinden oda davetinde kullanılan alanlar
type StoredUser = {
  id?: number;
  fullName?: string;
  totalFocusMinutes?: number;
};

type NudgePayload = {
  message?: string;
  senderName?: string;
};

let Notifications: NotificationsModule | null = null;

if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications') as NotificationsModule;
  Notifications!.setNotificationHandler({
    // shouldShowAlert (kullanımdan kalktı) yerine banner + liste; iOS'ta .alert = .banner + .list
    handleNotification: async (notification): Promise<NotificationBehavior> => {
      // Mola uyarısı ön planda uygulama içinde (titreşim + durum kartı) zaten veriliyor.
      const inApp = notification.request.content.data?.type === BREAK_ALERT_TYPE;
      return {
        shouldPlaySound: !inApp,
        shouldSetBadge: false,
        shouldShowBanner: !inApp,
        shouldShowList: !inApp,
      };
    },
  });
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    const openNotificationTarget = (data?: NotificationData) => {
      if (data?.type === 'room_invite' && typeof data.roomName === 'string') {
        const roomName = data.roomName;
        AsyncStorage.getItem('user_data').then((stored) => {
          const user: StoredUser = stored ? JSON.parse(stored) : {};
          router.push({
            pathname: '/sensor',
            params: {
              id: user.id,
              fullName: user.fullName,
              score: user.totalFocusMinutes,
              roomName,
            },
          });
        }).catch(() => {});
        return;
      }

      if (data?.type !== 'dm' || data.targetUserId === undefined || data.targetUserId === null) {
        return;
      }

      router.push({
        pathname: '/dm',
        params: {
          targetUserId: String(data.targetUserId),
          targetName: typeof data.targetName === 'string' ? data.targetName : 'Mesaj',
          targetUsername: typeof data.targetUsername === 'string' ? data.targetUsername : '',
        },
      });
    };

    const responseSub = Notifications?.addNotificationResponseReceivedListener((response) => {
      openNotificationTarget(response.notification.request.content.data as NotificationData);
    });

    if (!isExpoGo) {
      Notifications?.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          openNotificationTarget(response.notification.request.content.data as NotificationData);
        }
      });
    }

    if (!isExpoGo) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          saveTokenToBackend(token);
        }
      });
    }

    let globalSocket: Socket | null = null;
    const connectGlobalSocket = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        globalSocket = io(BACKEND_URL, { transports: ['websocket'], auth: { token } });
        
        globalSocket.on('nudge_received', (data: NudgePayload) => {
          Alert.alert('👋 Dürtüldün!', data.message || `${data.senderName} seni çalışmaya davet ediyor!`);
        });
      }
    };
    connectGlobalSocket();

    return () => {
      responseSub?.remove();
      if (globalSocket) {
        globalSocket.disconnect();
      }
    };
  }, [router]);

  async function saveTokenToBackend(token: string) {
    try {
      const stored = await AsyncStorage.getItem('user_data');
      const accessToken = await AsyncStorage.getItem('access_token');
      if (stored && accessToken) {
        const user = JSON.parse(stored);
        await fetch(apiUrl(`/users/${user.id}/push-token`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token }),
        });
        logger.debug("Push token backend'e kaydedildi.");
      }
    } catch (e) {
      logger.error('Push token kaydedilirken hata:', e);
    }
  }

  async function registerForPushNotificationsAsync(): Promise<string | undefined> {
    if (!Notifications) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Device = require('expo-device') as typeof import('expo-device');

    let token: string | undefined;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Bildirim izni alınamadı!');
        return undefined;
      }
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        if (!projectId) {
          logger.warn('Push bildirimleri için projectId bulunamadı.');
          return undefined;
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        logger.debug('Expo Push Token:', token);
      } catch (e) {
        logger.error('Push token alınamadı:', e);
      }
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: C.notification.lightColor,
      });
    }

    return token;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? Math.max(insets.bottom + 10, 25) : 25,
          left: 20,
          right: 20,
          backgroundColor: C.surface,
          borderRadius: 32,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 10,
          shadowColor: C.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 15,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="focus"
        options={{
          title: 'Odak',
          tabBarIcon: ({ color, focused }: { color: string, focused: boolean }) => (
            <FontAwesome5 size={focused ? 22 : 20} name="stopwatch" color={color} solid={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="lobbies"
        options={{
          title: 'Odalar',
          tabBarIcon: ({ color, focused }: { color: string, focused: boolean }) => (
            <FontAwesome5 size={focused ? 22 : 20} name="door-open" color={color} solid={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Ben',
          tabBarIcon: ({ color, focused }: { color: string, focused: boolean }) => (
            <FontAwesome5 size={focused ? 22 : 20} name="user-circle" color={color} solid={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="sensor"
        options={{ href: null }}
      />
    </Tabs>
  );
}
