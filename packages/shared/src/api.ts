// HTTP API sözleşmesi (giriş, oda oluşturma, davet, yükleme).

export interface PublicUser {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface RoomSummary {
  id: string;
  name: string;
  anniversary: string | null;
  inviteCode: string;
  memberCount: number;
}

export interface AppConfig {
  /** Google OAuth web client id; boşsa Google girişi kapalıdır. */
  googleClientId: string | null;
  /** Geliştirme girişi (sadece isimle) açık mı. */
  devLogin: boolean;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export interface MeResponse {
  user: PublicUser;
  room: RoomSummary | null;
}

export interface CreateRoomBody {
  name: string;
  anniversary: string | null;
}

export interface InvitePreview {
  roomName: string;
  inviter: { name: string; avatarUrl: string | null };
  full: boolean;
}

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'ROOM_FULL'
  | 'ALREADY_IN_ROOM'
  | 'GOOGLE_DISABLED'
  | 'DEV_LOGIN_DISABLED'
  | 'GOOGLE_INVALID';

export interface ApiError {
  error: ApiErrorCode;
}
