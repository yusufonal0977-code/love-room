import type { Reaction, ReactionKind, RoomAction, RoomState } from './types';
import type { CallSignal } from './call';

/**
 * Socket.IO tipli event sözleşmesi.
 * Kimlik doğrulama handshake'te (`auth: { token }`) yapılır; sunucu kullanıcıyı kendi odasına
 * otomatik bağlar, istemci oda id'si göndermez.
 */
export interface ClientToServerEvents {
  'room:action': (a: RoomAction) => void;
  'room:react': (kind: ReactionKind) => void;
  /** WebRTC sinyali — sunucu odadaki diğer kişiye aynen iletir. */
  'call:signal': (s: CallSignal) => void;
}

export interface ServerToClientEvents {
  /** Oda durumu küçük olduğu için her değişiklikte tamamı yayınlanır. */
  'room:state': (s: RoomState, serverNow: number) => void;
  'room:reaction': (r: Reaction) => void;
  'room:error': (code: 'NO_ROOM' | 'UNAUTHORIZED') => void;
  'call:signal': (s: CallSignal, from: string) => void;
  /** Günlüğe yazı ya da albüme fotoğraf eklendi: açık paneller listeyi tazeler. */
  'room:feed': (kind: 'diary' | 'album') => void;
}

export interface SocketData {
  userId: string;
  roomId: string;
}
