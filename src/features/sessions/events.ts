// Oturum değişiklikleri için küçük, tipli olay yayıcı.

import { logger } from '@/src/lib/logger';
import type { FocusSessionRecord } from './types';

export type Listener<E> = (event: E) => void;

export type Emitter<E> = {
  /** Dinleyici ekler; aboneliği kaldıran fonksiyonu döndürür. */
  subscribe: (listener: Listener<E>) => () => void;
  emit: (event: E) => void;
  listenerCount: () => number;
};

export function createEmitter<E>(): Emitter<E> {
  const listeners = new Set<Listener<E>>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(event) {
      // Kopya üzerinde dön: dinleyici kendini kaldırırsa döngü bozulmasın.
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch (err) {
          // Hatalı dinleyici kaydı ya da diğer dinleyicileri bozmasın.
          logger.error('[sessions] dinleyici hatası', err);
        }
      }
    },
    listenerCount: () => listeners.size,
  };
}

export type SessionsChangeEvent =
  | { type: 'saved'; record: FocusSessionRecord }
  | { type: 'cleared' };

/** Oturum deposundaki değişiklikler (kayıt eklendi / tümü silindi). */
export const sessionEvents = createEmitter<SessionsChangeEvent>();
