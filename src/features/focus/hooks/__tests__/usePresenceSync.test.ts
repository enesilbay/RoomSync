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
  it('yalnızca değer değişince gönderir', async () => {
    const { ref, emits } = fakeSocket();
    const { rerender } = await setup(ref);
    expect(values(emits)).toEqual([false]);

    await rerender({ presence: false });
    await rerender({ presence: true });
    await rerender({ presence: true });
    await rerender({ presence: false });
    expect(values(emits)).toEqual([false, true, false]);
    expect(emits[1]).toEqual({ event: 'update_presence', payload: { isAtDesk: true, roomName: 'Kütüphane' } });
  });

  it('bağlı değilken göndermez; bağlantı (yeniden) kurulunca güncel değeri gönderir', async () => {
    const { socket, ref, emits } = fakeSocket(false);
    const { rerender, result } = await setup(ref);
    await rerender({ presence: true });
    expect(emits).toHaveLength(0);

    socket.connected = true;
    result.current.onConnect();
    expect(values(emits)).toEqual([true]);

    // Kopup yeniden bağlanınca sunucu yeni socket'i tanımaz: aynı değer tekrar gider.
    result.current.onConnect();
    expect(values(emits)).toEqual([true, true]);

    // Bağlantı sonrası değişiklik yine yalnızca değişimde gider.
    await rerender({ presence: true });
    await rerender({ presence: false });
    expect(values(emits)).toEqual([true, true, false]);
  });

  it('socket kapanmadan önce masadaysa false gönderir', async () => {
    const { ref, emits } = fakeSocket();
    const { rerender, result } = await setup(ref, true);
    expect(values(emits)).toEqual([true]);

    result.current.onBeforeDisconnect();
    expect(values(emits)).toEqual([true, false]);

    // Socket kapandıktan sonra gelen false değişimi (bağlı değil) tekrar denenmez.
    ref.current = null;
    await rerender({ presence: false });
    expect(values(emits)).toEqual([true, false]);
  });

  it('zaten false iken kapanışta fazladan göndermez', async () => {
    const { ref, emits } = fakeSocket();
    const { result } = await setup(ref, false);
    result.current.onBeforeDisconnect();
    expect(values(emits)).toEqual([false]);
  });
});
