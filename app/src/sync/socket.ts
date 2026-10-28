import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@loveroom/shared';
import { SERVER_URL } from '../config';

export type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: RoomSocket | null = null;

/** Oturum token'ıyla tek bir soket açar; kimlik handshake'te doğrulanır. */
export function openSocket(token: string): RoomSocket {
  socket?.disconnect();
  socket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: { token, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });
  return socket;
}

export const getSocket = () => socket;

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
