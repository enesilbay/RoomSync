import { renderHook } from '@testing-library/react-native';
import type { Socket } from 'socket.io-client';
import type { SocketRef } from '../../types';
import { usePresenceSync } from '../usePresenceSync';

type Emit = { event: string; payload: unknown };

/** Yalnızca `connected` ve `emit` kullanılan sahte socket. */
function fakeSocket(connected = true) {
  const emits: Emit[] = [];
  const socket = {
    connected,
    emit: (event: string, payload: unknown) => {
      emits.push({ event, payload });
      return socket;
    },
  };
  const ref: SocketRef = { current: socket as unknown as Socket };
  return { socket, ref, emits };
}

type Props = { presence: boolean };

function setup(ref: SocketRef, presence = false) {
  return renderHook((p: Props) => usePresenceSync({ socketRef: ref, presence: p.presence, roomName: 'Kütüphane' }), {
    initialProps: { presence },
  });
}

const values = (emits: Emit[]) => emits.map((e) => (e.payload as { isAtDesk: boolean }).isAtDesk);

describe('usePresenceSync', () => {
  it('yalnızca değer değişince gönderir', () => {
    const { ref, emits } = fakeSocket();
    const { rerender } = setup(ref);
    expect(values(emits)).toEqual([false]);

    rerender({ presence: false });
    rerender({ presence: true });
    rerender({ presence: true });
    rerender({ presence: false });
    expect(values(emits)).toEqual([false, true, false]);
    expect(emits[1]).toEqual({ event: 'update_presence', payload: { isAtDesk: true, roomName: 'Kütüphane' } });
  });

  it('bağlı değilken göndermez; bağlantı (yeniden) kurulunca güncel değeri gönderir', () => {
    const { socket, ref, emits } = fakeSocket(false);
    const { rerender, result } = setup(ref);
    rerender({ presence: true });
    expect(emits).toHaveLength(0);

    socket.connected = true;
    result.current.onConnect();
    expect(values(emits)).toEqual([true]);

    // Kopup yeniden bağlanınca sunucu yeni socket'i tanımaz: aynı değer tekrar gider.
    result.current.onConnect();
    expect(values(emits)).toEqual([true, true]);

    // Bağlantı sonrası değişiklik yine yalnızca değişimde gider.
    rerender({ presence: true });
    rerender({ presence: false });
    expect(values(emits)).toEqual([true, true, false]);
  });

  it('socket kapanmadan önce masadaysa false gönderir', () => {
    const { ref, emits } = fakeSocket();
    const { rerender, result } = setup(ref, true);
    expect(values(emits)).toEqual([true]);

    result.current.onBeforeDisconnect();
    expect(values(emits)).toEqual([true, false]);

    // Socket kapandıktan sonra gelen false değişimi (bağlı değil) tekrar denenmez.
    ref.current = null;
    rerender({ presence: false });
    expect(values(emits)).toEqual([true, false]);
  });

  it('zaten false iken kapanışta fazladan göndermez', () => {
    const { ref, emits } = fakeSocket();
    const { result } = setup(ref, false);
    result.current.onBeforeDisconnect();
    expect(values(emits)).toEqual([false]);
  });
});
