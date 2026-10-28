import type { Server as HttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server } from 'socket.io';
import {
  isCallSignal,
  isReactionKind,
  isRoomAction,
  reduceRoom,
  type ClientToServerEvents,
  type RoomState,
  type ServerToClientEvents,
  type SocketData,
} from '@loveroom/shared';
import { verifyToken } from './auth';
import * as db from './db';
import { CORS_ORIGIN } from './env';

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
let io: IO | null = null;

/** Aktif odaların bellek içi kopyası; her değişiklik SQLite'a da yazılır. */
const live = new Map<string, RoomState>();

function getLive(roomId: string): RoomState | null {
  const cached = live.get(roomId);
  if (cached) return cached;
  const loaded = db.loadRoomState(roomId);
  if (loaded) live.set(roomId, loaded);
  return loaded;
}

function commit(next: RoomState, persist = true) {
  live.set(next.roomId, next);
  if (persist) db.saveRoomState(next);
  io?.to(next.roomId).emit('room:state', next, Date.now());
}

async function onlineUsers(roomId: string) {
  const sockets = await io!.in(roomId).fetchSockets();
  return [...new Set(sockets.map((s) => s.data.userId))];
}

/** Üye/çevrimiçi listesini yeniden hesaplar. Çevrimdışı olan kanepeden de kalkar. */
async function refreshPresence(roomId: string) {
  const room = getLive(roomId);
  if (!room) return;
  const online = await onlineUsers(roomId);
  commit({ ...room, online, members: db.roomMembers(roomId), sofa: room.sofa.filter((u) => online.includes(u)) }, false);
}

/** HTTP tarafı (davet kabulü) yeni üye eklediğinde odadakilere haber verir. */
export function refreshRoomMembers(roomId: string) {
  void refreshPresence(roomId);
}

export function attachRealtime(httpServer: HttpServer) {
  io = new Server(httpServer, { cors: { origin: CORS_ORIGIN } });

  // Handshake'te kimlik doğrula ve kullanıcının odasını bul; istemci oda id'si göndermez.
  io.use((socket, next) => {
    const userId = verifyToken(socket.handshake.auth?.token);
    if (!userId) return next(new Error('UNAUTHORIZED'));
    const roomId = db.roomIdOf(userId);
    if (!roomId) return next(new Error('NO_ROOM'));
    socket.data = { userId, roomId };
    next();
  });

  io.on('connection', async (socket) => {
    const { userId, roomId } = socket.data;
    const tz = socket.handshake.auth?.timezone;
    if (typeof tz === 'string' && tz.length < 64) db.setTimezone(userId, tz);

    await socket.join(roomId);
    await refreshPresence(roomId);

    // Tüm etkileşimler tek kanaldan akar: aksiyon → reducer → odaya yayın.
    socket.on('room:action', (action) => {
      if (!isRoomAction(action)) return;
      const room = getLive(roomId);
      if (!room) return;
      const next = reduceRoom(room, action, userId, Date.now());
      if (next !== room) commit(next);
    });

    // Tepkiler kalıcı değildir; sadece anlık yayınlanır. Basit hız sınırı: 250 ms.
    let lastReaction = 0;
    socket.on('room:react', (kind) => {
      const now = Date.now();
      if (!isReactionKind(kind) || now - lastReaction < 250) return;
      lastReaction = now;
      io!.to(roomId).emit('room:reaction', { id: randomUUID(), kind, from: userId, at: now });
    });

    // Arama sinyalleri: içerik sunucuda saklanmaz, sadece odadaki diğer kişiye iletilir.
    socket.on('call:signal', (signal) => {
      if (!isCallSignal(signal)) return;
      socket.to(roomId).emit('call:signal', signal, userId);
    });

    socket.on('disconnect', () => void refreshPresence(roomId));
  });
}
