import { create } from 'zustand';
import type { AppConfig, AuthResponse, MeResponse, PublicUser, RoomSummary } from '@loveroom/shared';
import { api, ApiError } from '../lib/api';
import { clearToken, loadToken, saveToken } from '../lib/tokenStorage';
import { readLaunchInvite } from '../lib/inviteLink';

type Phase = 'loading' | 'signedOut' | 'signedIn' | 'offline';

interface SessionStore {
  phase: Phase;
  config: AppConfig | null;
  token: string | null;
  user: PublicUser | null;
  room: RoomSummary | null;
  /** Davet linkiyle gelindiyse kod; giriş sonrası kabul ekranı gösterilir. */
  pendingInvite: string | null;
  /** Oda yeni kurulduysa önce davet paylaşma ekranı gösterilir. */
  showInviteShare: boolean;

  boot: () => Promise<void>;
  signIn: (auth: AuthResponse, perTab: boolean) => Promise<void>;
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
  setRoom: (room: RoomSummary, fresh?: boolean) => void;
  setPendingInvite: (code: string | null) => void;
  dismissInviteShare: () => void;
}

export const useSession = create<SessionStore>((set, get) => ({
  phase: 'loading',
  config: null,
  token: null,
  user: null,
  room: null,
  pendingInvite: null,
  showInviteShare: false,

  boot: async () => {
    const [config, invite, token] = await Promise.all([
      api<AppConfig>('/config').catch(() => null),
      readLaunchInvite(),
      loadToken(),
    ]);
    if (!config) return set({ phase: 'offline', pendingInvite: invite });
    set({ config, pendingInvite: invite ?? get().pendingInvite, token });
    if (token) await get().refreshMe();
    else set({ phase: 'signedOut' });
  },

  signIn: async ({ token, user }, perTab) => {
    await saveToken(token, perTab);
    set({ token, user });
    await get().refreshMe();
  },

  refreshMe: async () => {
    const { token } = get();
    try {
      const me = await api<MeResponse>('/me', { token });
      set({ phase: 'signedIn', user: me.user, room: me.room });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await clearToken();
        set({ phase: 'signedOut', token: null, user: null, room: null });
      } else {
        set({ phase: 'offline' });
      }
    }
  },

  signOut: async () => {
    await clearToken();
    set({ phase: 'signedOut', token: null, user: null, room: null, showInviteShare: false });
  },

  setRoom: (room, fresh = false) => set({ room, showInviteShare: fresh }),
  setPendingInvite: (pendingInvite) => set({ pendingInvite }),
  dismissInviteShare: () => set({ showInviteShare: false }),
}));
