// Odak oturumu geri bildirimi: faz geçişlerinde titreşim, bitişte titreşim deseni ve zil.
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';
import { logger } from '@/src/lib/logger';
import type { SessionPhase } from './engine/types';

type FeedbackCue = 'start' | 'focus' | 'break' | 'overdue' | 'complete';

const IS_WEB = Platform.OS === 'web';

const CHIME_SOURCE: number = require('../../../assets/sounds/chime.m4a');
/** Zil 1,5 sn; bitiş olayı gelmezse oynatıcı bu süre sonunda yine de bırakılır. */
const CHIME_RELEASE_MS = 4000;
/** Bitiş deseninde başarı titreşiminden sonraki hafif vuruşların gecikmeleri (ms). */
const COMPLETE_PATTERN_MS = [180, 360] as const;

/** Faz geçişine karşılık gelen geri bildirim; bitiş onCompleted üzerinden ayrıca verilir. */
export function cueForTransition(prev: SessionPhase, next: SessionPhase): FeedbackCue | null {
  if (prev === next) return null;
  if (next === 'waiting') return 'start';
  if (next === 'focusing') return 'focus';
  if (next === 'break') return 'break';
  return null;
}

const ignore = (err: unknown) => logger.debug('[focus] titreşim verilemedi', err);

export function playHaptic(cue: FeedbackCue): void {
  if (IS_WEB) return;
  switch (cue) {
    case 'start':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
      return;
    case 'focus':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
      return;
    case 'break':
    case 'overdue':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(ignore);
      return;
    case 'complete':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
      for (const delay of COMPLETE_PATTERN_MS) {
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
        }, delay);
      }
      return;
  }
}

/**
 * Bitiş zilini bir kez çalar ve oynatıcıyı bırakır. Ses modu (sessiz anahtar, karışma)
 * ortam sesi hook'unun ayarladığı gibi kalır; burada değiştirilmez.
 */
export function playCompletionChime(): void {
  try {
    const player = createAudioPlayer(CHIME_SOURCE);
    let released = false;
    let fallback: ReturnType<typeof setTimeout> | null = null;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) release();
    });
    function release() {
      if (released) return;
      released = true;
      if (fallback !== null) clearTimeout(fallback);
      sub.remove();
      player.remove();
    }
    fallback = setTimeout(release, CHIME_RELEASE_MS);
    player.play();
  } catch (err) {
    logger.debug('[focus] bitiş zili çalınamadı', err);
  }
}
