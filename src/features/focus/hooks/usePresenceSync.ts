import { useCallback, useEffect, useRef } from 'react';
import type { SearchParam, SocketRef } from '../types';

type Options = {
  socketRef: SocketRef;
  /** Odadakilere gösterilen "masada" durumu. */
  presence: boolean;
  roomName: SearchParam;
};

/**
 * Oda varlığını (update_presence) socket ile eşitler:
 * - Değer yalnızca değiştiğinde gönderilir (son gönderilen değer takip edilir).
 * - Bağlantı (yeniden) kurulunca güncel değer tekrar gönderilir; sunucu yeni socket'i tanımaz.
 * - Socket kapanmadan hemen önce false gönderilir. Bunu useRoomSocket çağırır; effect
 *   sırasına güvenilmez (eski kodda socket önce kapanıp son false kayboluyordu).
 */
export function usePresenceSync({ socketRef, presence, roomName }: Options) {
  const presenceRef = useRef(presence);
  const roomNameRef = useRef(roomName);
  /** Bu bağlantıda en son gönderilen değer; null: henüz gönderilmedi. */
  const sentRef = useRef<boolean | null>(null);

  useEffect(() => {
    roomNameRef.current = roomName;
  }, [roomName]);

  const send = useCallback(
    (value: boolean) => {
      const socket = socketRef.current;
      // Bağlı değilken gönderilmez; bağlantı gelince onConnect güncel değeri yollar.
      if (!socket?.connected) return;
      socket.emit('update_presence', { isAtDesk: value, roomName: roomNameRef.current });
      sentRef.current = value;
    },
    [socketRef],
  );

  useEffect(() => {
    presenceRef.current = presence;
    if (sentRef.current !== presence) send(presence);
  }, [presence, send]);

  const onConnect = useCallback(() => {
    sentRef.current = null;
    send(presenceRef.current);
  }, [send]);

  const onBeforeDisconnect = useCallback(() => {
    if (sentRef.current === true) send(false);
    sentRef.current = null;
  }, [send]);

  return { onConnect, onBeforeDisconnect };
}
