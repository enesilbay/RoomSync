// Mola uzadı yerel bildirimi: telefon masadan kalkınca işletim sistemine kurulur,
// odak geri gelince veya oturum bitince iptal edilir. Uygulama arka plandayken de çalışır.
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { logger } from '@/src/lib/logger';
import type { SessionPhase } from './engine/types';

type NotificationsModule = typeof import('expo-notifications');

/** Bildirim verisindeki tür; ön plandaki bildirim işleyicisi bunu tanır. */
export const BREAK_ALERT_TYPE = 'focus_break_overdue';

export const BREAK_ALERT_CONTENT = {
  title: 'Mola uzadı',
  body: 'Odaklanmaya dönmek için telefonu masaya bırak',
} as const;

type BreakAlertDecision =
  | { type: 'schedule'; key: number; fireAt: number }
  | { type: 'cancel' }
  | { type: 'none' };

type DecisionInput = {
  phase: SessionPhase;
  /** Telefonun masadan kalktığı an; aynı kalkış için tek bildirim kurulur (anahtar). */
  leftDeskAt: number | null;
  /** Kurulu bildirimin anahtarı; yoksa null. */
  scheduledKey: number | null;
  breakLimitMs: number;
  now: number;
};

/**
 * Saf karar: kalkış (glancing/break) varken leftDeskAt + breakLimitMs anına bir bildirim olmalı;
 * başka her fazda (odak geri geldi, bitti, sıfırlandı) kurulu bildirim iptal edilir.
 */
export function decideBreakAlert({
  phase,
  leftDeskAt,
  scheduledKey,
  breakLimitMs,
  now,
}: DecisionInput): BreakAlertDecision {
  const away = (phase === 'glancing' || phase === 'break') && leftDeskAt !== null;
  if (away) {
    if (scheduledKey === leftDeskAt) return { type: 'none' };
    const fireAt = leftDeskAt + breakLimitMs;
    // Süre zaten geçtiyse (geç gelen render) uygulama içi uyarı yeterli.
    if (fireAt <= now) return scheduledKey === null ? { type: 'none' } : { type: 'cancel' };
    return { type: 'schedule', key: leftDeskAt, fireAt };
  }
  return scheduledKey === null ? { type: 'none' } : { type: 'cancel' };
}

// _layout.tsx ile aynı kontrol: Expo Go'da expo-notifications yüklenmez.
function loadNotifications(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as NotificationsModule;
}

/**
 * Bildirimi kurar ve kimliğini döndürür. Expo Go'da, web'de veya izin yoksa sessizce null
 * (izin burada istenmez; izin akışı Faz 5 onboarding'de).
 */
export async function scheduleBreakAlert(fireAt: number): Promise<string | null> {
  const Notifications = loadNotifications();
  if (!Notifications) return null;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    return await Notifications.scheduleNotificationAsync({
      content: { ...BREAK_ALERT_CONTENT, data: { type: BREAK_ALERT_TYPE } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  } catch (err) {
    logger.warn('[focus] mola bildirimi kurulamadı', err);
    return null;
  }
}

/** Kurulum henüz sürüyor olabilir: kimlik gelince iptal edilir. */
export async function cancelBreakAlert(pending: Promise<string | null>): Promise<void> {
  const id = await pending;
  if (id === null) return;
  const Notifications = loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (err) {
    logger.warn('[focus] mola bildirimi iptal edilemedi', err);
  }
}
