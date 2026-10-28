import { useEffect } from 'react';
import { useRoomStore } from '../state/room';
import { useSession } from '../state/session';
import { closeSocket, openSocket } from './socket';
import { handleSignal, hangUp } from '../call/callStore';
import { useFeed } from '../state/feed';

/**
 * Kullanıcının odasına gerçek zamanlı bağlanır ve sunucu durumunu store'a akıtır.
 * Socket.IO yeniden bağlanmayı kendisi yapar; sunucu her bağlantıda tam durumu yollar.
 */
export function useRoomSync() {
  const token = useSession((s) => s.token);
  const userId = useSession((s) => s.user?.id ?? null);

  useEffect(() => {
    if (!token || !userId) return;
    useRoomStore.setState({ userId, room: null, status: 'connecting', reactions: [] });
    const socket = openSocket(token);
    const store = useRoomStore.getState();

    socket.on('room:state', store.receive);
    socket.on('room:reaction', store.pushReaction);
    socket.on('call:signal', (signal, from) => void handleSignal(signal, from));
    socket.on('room:feed', (kind) => useFeed.getState().refresh(kind));
    useFeed.getState().reset();
    socket.on('disconnect', () => useRoomStore.setState({ status: 'offline' }));
    socket.on('connect_error', (err) => {
      // Oturum düştüyse ya da kullanıcı artık bir odada değilse oturum bilgisini tazele.
      if (err.message === 'UNAUTHORIZED' || err.message === 'NO_ROOM') void useSession.getState().refreshMe();
      useRoomStore.setState({ status: 'offline' });
    });

    return () => {
      hangUp(); // açık arama varsa karşı tarafa haber ver
      closeSocket();
    };
  }, [token, userId]);
}
