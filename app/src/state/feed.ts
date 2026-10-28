import { create } from 'zustand';
import type { AlbumPhoto, DiaryEntry } from '@loveroom/shared';
import { api } from '../lib/api';
import { useSession } from './session';

/**
 * Günlük ve albüm oda durumundan ayrı tutulur (sınırsız büyüyebilirler). Panel açılınca yüklenir;
 * sunucu "room:feed" ile haber verince, daha önce yüklenmişse tazelenir.
 */
interface FeedStore {
  diary: DiaryEntry[] | null;
  album: AlbumPhoto[] | null;
  loadDiary: () => Promise<void>;
  loadAlbum: () => Promise<void>;
  refresh: (kind: 'diary' | 'album') => void;
  reset: () => void;
}

const token = () => useSession.getState().token;

export const useFeed = create<FeedStore>((set, get) => ({
  diary: null,
  album: null,
  loadDiary: async () => set({ diary: await api<DiaryEntry[]>('/diary', { token: token() }) }),
  loadAlbum: async () => set({ album: await api<AlbumPhoto[]>('/album', { token: token() }) }),
  refresh: (kind) => {
    if (kind === 'diary' && get().diary) void get().loadDiary();
    if (kind === 'album' && get().album) void get().loadAlbum();
  },
  reset: () => set({ diary: null, album: null }),
}));
