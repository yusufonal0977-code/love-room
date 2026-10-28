// Oda modeli: istemci ve sunucunun ortak "tek doğruluk kaynağı" tanımı.

/** Saat yönünde sıralı duvarlar: sağa kaydırınca bir sonrakine geçilir (sağa dönmek gibi). */
export const WALLS = ['front', 'right', 'back', 'left'] as const;
export type WallId = (typeof WALLS)[number];

/**
 * Her etkileşimli objenin hangi duvarda durduğu (proje taslağındaki yerleşim):
 * Ön: TV + halı + pet · Arka: kanepe + ilişki saati · Sol: Tablo 1, şömine, Tablo 2 ·
 * Sağ: foto, pencere, foto; pencerenin altındaki dolapta pikap ve soru kavanozu.
 */
export const OBJECT_WALL = {
  tv: 'front',
  pet: 'front',
  sofa: 'back',
  clock: 'back',
  fireplace: 'left',
  'frame-left-1': 'left',
  'frame-left-2': 'left',
  window: 'right',
  'photo-right-1': 'right',
  'photo-right-2': 'right',
  record: 'right',
  jar: 'right',
} as const satisfies Record<string, WallId>;
export type ObjectId = keyof typeof OBJECT_WALL;

export const FRAME_IDS = ['frame-left-1', 'frame-left-2', 'photo-right-1', 'photo-right-2'] as const;
export type FrameId = (typeof FRAME_IDS)[number];

export interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** IANA saat dilimi (ör. "Europe/Istanbul") — pencere iki şehrin saatini gösterir. */
  timezone: string | null;
}

export interface Focus {
  objectId: ObjectId;
  /** Odağı tetikleyen kullanıcının id'si. */
  by: string;
  at: number;
}

export interface TvState {
  on: boolean;
  playing: boolean;
  mediaUrl: string | null;
  mediaTitle: string | null;
  /** `updatedAt` anındaki oynatma konumu (sn). Canlı konum = positionSec + geçen süre. */
  positionSec: number;
  updatedAt: number;
}

/** Pikaptaki ortak müzik — TV ile aynı zaman senkronu modeli. */
export interface MusicState {
  playing: boolean;
  trackUrl: string | null;
  trackTitle: string | null;
  positionSec: number;
  updatedAt: number;
}

/** Soru kavanozundan çekilmiş soru; cevaplar ikisi de cevaplayınca görünür. */
export interface QuestionState {
  id: string;
  text: string;
  category: string;
  askedBy: string;
  at: number;
  answers: Record<string, string>;
}

export interface AnsweredQuestion {
  text: string;
  category: string;
  answers: Record<string, string>;
  at: number;
}

export interface PetState {
  name: string;
  lastFedAt: number;
  lastPettedAt: number;
  lastPettedBy: string | null;
}

export interface FrameState {
  url: string | null;
  caption: string | null;
  by: string | null;
}

export interface RoomState {
  roomId: string;
  name: string;
  /** İlişki başlangıcı, "YYYY-MM-DD". İlişki saati bundan sayar. */
  anniversary: string | null;
  /** Her başarılı aksiyonda +1. */
  version: number;
  members: Member[];
  online: string[];
  focus: Focus | null;
  tv: TvState;
  pet: PetState;
  frames: Record<FrameId, FrameState>;
  fireplaceLit: boolean;
  /** Kanepede oturan kullanıcı id'leri — ikisi de oturunca yan yana görünürler. */
  sofa: string[];
  music: MusicState;
  question: QuestionState | null;
  /** İkisinin de cevapladığı sorular — anı defteri (en yeni başta). */
  qaHistory: AnsweredQuestion[];
}

/** İstemcinin gönderebileceği tüm niyetler. Sunucu bunları reducer'dan geçirir. */
export type RoomAction =
  | { type: 'focus/set'; objectId: ObjectId }
  | { type: 'focus/clear' }
  | { type: 'tv/power' }
  | { type: 'tv/play' }
  | { type: 'tv/pause' }
  | { type: 'tv/seek'; positionSec: number }
  | { type: 'tv/load'; mediaUrl: string; mediaTitle: string }
  | { type: 'pet/feed' }
  | { type: 'pet/pet' }
  | { type: 'pet/rename'; name: string }
  | { type: 'frame/set'; frameId: FrameId; url: string; caption: string | null }
  | { type: 'frame/clear'; frameId: FrameId }
  | { type: 'fireplace/toggle' }
  | { type: 'sofa/toggle' }
  | { type: 'music/load'; trackUrl: string; trackTitle: string }
  | { type: 'music/play' }
  | { type: 'music/pause' }
  | { type: 'question/draw'; questionId: string }
  | { type: 'question/answer'; text: string };

/** Kalıcı olmayan, anlık duygusal etkileşimler (taslaktaki "çift etkileşimli animasyonlar"). */
export const REACTIONS = ['heart', 'hug', 'kiss', 'miss'] as const;
export type ReactionKind = (typeof REACTIONS)[number];

export interface Reaction {
  id: string;
  kind: ReactionKind;
  from: string;
  at: number;
}
