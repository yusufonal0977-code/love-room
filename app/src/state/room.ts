import { create } from 'zustand';
import {
  reduceRoom,
  type Member,
  type ObjectId,
  type Reaction,
  type ReactionKind,
  type RoomAction,
  type RoomState,
} from '@loveroom/shared';
import { getSocket } from '../sync/socket';

type Status = 'connecting' | 'online' | 'offline';

interface RoomStore {
  room: RoomState | null;
  userId: string | null;
  status: Status;
  /** serverNow - Date.now(); TV konumu gibi zamana bağlı hesaplarda saat farkını düzeltir. */
  clockOffset: number;
  reactions: Reaction[];

  /** Sunucudan gelen otoriter durum — her zaman yerel iyimser durumun üstüne yazar. */
  receive: (room: RoomState, serverNow: number) => void;
  /** Kullanıcı etkileşimi: önce yerelde uygula (anında tepki), sonra sunucuya gönder. */
  dispatch: (action: RoomAction) => void;
  react: (kind: ReactionKind) => void;
  pushReaction: (r: Reaction) => void;
  dropReaction: (id: string) => void;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  room: null,
  userId: null,
  status: 'connecting',
  clockOffset: 0,
  reactions: [],

  receive: (room, serverNow) => set({ room, status: 'online', clockOffset: serverNow - Date.now() }),

  dispatch: (action) => {
    const { room, userId, clockOffset } = get();
    if (!room || !userId) return;
    set({ room: reduceRoom(room, action, userId, Date.now() + clockOffset) });
    getSocket()?.emit('room:action', action);
  },

  react: (kind) => getSocket()?.emit('room:react', kind),
  pushReaction: (r) => set((s) => ({ reactions: [...s.reactions.slice(-20), r] })),
  dropReaction: (id) => set((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) })),
}));

export const serverNow = () => Date.now() + useRoomStore.getState().clockOffset;

// ---- Kısayol seçiciler: bileşenler yalnızca ilgilendikleri dilime abone olur ----

export const useDispatch = () => useRoomStore((s) => s.dispatch);
export const useIsFocused = (objectId: ObjectId) => useRoomStore((s) => s.room?.focus?.objectId === objectId);
export const useRoom = <T,>(pick: (r: RoomState) => T) => useRoomStore((s) => pick(s.room!));

export function useMe(): Member | null {
  return useRoomStore((s) => s.room?.members.find((m) => m.id === s.userId) ?? null);
}
export function usePartner(): Member | null {
  return useRoomStore((s) => s.room?.members.find((m) => m.id !== s.userId) ?? null);
}
export const memberName = (room: RoomState, id: string | null) => room.members.find((m) => m.id === id)?.name ?? 'Biri';
