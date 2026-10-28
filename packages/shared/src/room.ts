import {
  FRAME_IDS,
  OBJECT_WALL,
  REACTIONS,
  type FrameId,
  type ObjectId,
  type ReactionKind,
  type RoomAction,
  type RoomState,
  type TvState,
} from './types';
import { questionById } from './questions';

export const PET_HUNGRY_AFTER_MS = 8 * 60 * 60 * 1000;
export const MAX_MEMBERS = 2;

export function createRoom(roomId: string, name: string, anniversary: string | null, now = Date.now()): RoomState {
  return {
    roomId,
    name,
    anniversary,
    version: 0,
    members: [],
    online: [],
    focus: null,
    tv: { on: false, playing: false, mediaUrl: null, mediaTitle: null, positionSec: 0, updatedAt: now },
    pet: { name: 'Mochi', lastFedAt: now, lastPettedAt: 0, lastPettedBy: null },
    frames: Object.fromEntries(FRAME_IDS.map((id) => [id, { url: null, caption: null, by: null }])) as RoomState['frames'],
    fireplaceLit: true,
    sofa: [],
    music: { playing: false, trackUrl: null, trackTitle: null, positionSec: 0, updatedAt: now },
    question: null,
    qaHistory: [],
  };
}

/** Eski sürümlerde kaydedilmiş durumları güncel şemaya tamamlar. */
export function migrateRoom(s: RoomState): RoomState {
  const base = createRoom(s.roomId, s.name ?? 'Bizim Ev', s.anniversary ?? null);
  return {
    ...base,
    ...s,
    tv: { ...base.tv, ...s.tv },
    music: { ...base.music, ...s.music },
    pet: { ...base.pet, ...s.pet },
    frames: { ...base.frames, ...s.frames },
  };
}

/** Oynatma konumunu `now` anına göre hesaplar; iki cihaz aynı formülle senkron kalır. TV ve pikap için ortak. */
export function tvPosition(media: Pick<TvState, 'playing' | 'positionSec' | 'updatedAt'>, now: number): number {
  return media.playing ? media.positionSec + (now - media.updatedAt) / 1000 : media.positionSec;
}

const MAX_HISTORY = 30;

/** İlişki saatinin gün sayısı. */
export function daysTogether(anniversary: string | null, now: number): number | null {
  if (!anniversary) return null;
  const start = Date.parse(`${anniversary}T00:00:00`);
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now - start) / 86_400_000));
}

/**
 * Saf reducer: hem sunucuda (otorite) hem istemcide (iyimser güncelleme) çalışır.
 * Bir aksiyon odak değişikliği de doğurabilir — "TV açılınca iki ekran da TV'ye zoom yapar"
 * kuralı burada, tek bir yerde tanımlı.
 */
export function reduceRoom(s: RoomState, a: RoomAction, userId: string, now: number): RoomState {
  const next = apply(s, a, userId, now);
  return next === s ? s : { ...next, version: s.version + 1 };
}

function apply(s: RoomState, a: RoomAction, userId: string, now: number): RoomState {
  const focusOn = (objectId: ObjectId) => ({ objectId, by: userId, at: now });

  switch (a.type) {
    case 'focus/set':
      return { ...s, focus: focusOn(a.objectId) };

    case 'focus/clear':
      return s.focus ? { ...s, focus: null } : s;

    case 'tv/power': {
      const on = !s.tv.on;
      return {
        ...s,
        tv: { ...s.tv, on, playing: false, positionSec: tvPosition(s.tv, now), updatedAt: now },
        focus: on ? focusOn('tv') : s.focus?.objectId === 'tv' ? null : s.focus,
      };
    }

    case 'tv/play':
      if (!s.tv.on || !s.tv.mediaUrl || s.tv.playing) return s;
      return { ...s, tv: { ...s.tv, playing: true, updatedAt: now }, focus: focusOn('tv') };

    case 'tv/pause':
      if (!s.tv.playing) return s;
      return { ...s, tv: { ...s.tv, playing: false, positionSec: tvPosition(s.tv, now), updatedAt: now } };

    case 'tv/seek':
      return { ...s, tv: { ...s.tv, positionSec: Math.max(0, a.positionSec), updatedAt: now } };

    case 'tv/load':
      return {
        ...s,
        tv: { on: true, playing: false, mediaUrl: a.mediaUrl, mediaTitle: a.mediaTitle, positionSec: 0, updatedAt: now },
        focus: focusOn('tv'),
      };

    case 'pet/feed':
      return { ...s, pet: { ...s.pet, lastFedAt: now } };

    case 'pet/pet':
      return { ...s, pet: { ...s.pet, lastPettedAt: now, lastPettedBy: userId } };

    case 'pet/rename':
      return { ...s, pet: { ...s.pet, name: a.name.trim().slice(0, 20) || s.pet.name } };

    case 'frame/set':
      return { ...s, frames: { ...s.frames, [a.frameId]: { url: a.url, caption: a.caption, by: userId } } };

    case 'frame/clear':
      return { ...s, frames: { ...s.frames, [a.frameId]: { url: null, caption: null, by: null } } };

    case 'fireplace/toggle':
      return { ...s, fireplaceLit: !s.fireplaceLit };

    case 'sofa/toggle':
      return {
        ...s,
        sofa: s.sofa.includes(userId) ? s.sofa.filter((u) => u !== userId) : [...s.sofa, userId],
      };

    case 'music/load':
      return {
        ...s,
        music: { playing: true, trackUrl: a.trackUrl, trackTitle: a.trackTitle, positionSec: 0, updatedAt: now },
      };

    case 'music/play':
      if (!s.music.trackUrl || s.music.playing) return s;
      return { ...s, music: { ...s.music, playing: true, updatedAt: now } };

    case 'music/pause':
      if (!s.music.playing) return s;
      return { ...s, music: { ...s.music, playing: false, positionSec: tvPosition(s.music, now), updatedAt: now } };

    case 'question/draw': {
      const question = questionById(a.questionId);
      if (!question) return s;
      // Önceki soruyu ikisi de cevapladıysa anı defterine kaldır.
      const prev = s.question;
      const done = prev && Object.keys(prev.answers).length >= MAX_MEMBERS;
      return {
        ...s,
        question: { id: question.id, text: question.text, category: question.category, askedBy: userId, at: now, answers: {} },
        qaHistory: done
          ? [{ text: prev.text, category: prev.category, answers: prev.answers, at: prev.at }, ...s.qaHistory].slice(0, MAX_HISTORY)
          : s.qaHistory,
      };
    }

    case 'question/answer': {
      const text = a.text.trim().slice(0, 500);
      if (!s.question || !text) return s;
      return { ...s, question: { ...s.question, answers: { ...s.question.answers, [userId]: text } } };
    }
  }
}

const isMediaUrl = (u: unknown) => typeof u === 'string' && u.length < 2000 && /^(https?:\/\/|\/uploads\/)/.test(u);
const isShortText = (t: unknown, max: number) => typeof t === 'string' && t.length <= max;

/** Sunucu tarafı minimal doğrulama (prod'da zod/valibot ile değiştirin). */
export function isRoomAction(x: unknown): x is RoomAction {
  if (!x || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  switch (a.type) {
    case 'focus/set':
      return typeof a.objectId === 'string' && a.objectId in OBJECT_WALL;
    case 'tv/seek':
      return typeof a.positionSec === 'number' && Number.isFinite(a.positionSec);
    case 'tv/load':
      return isMediaUrl(a.mediaUrl) && isShortText(a.mediaTitle, 120);
    case 'pet/rename':
      return isShortText(a.name, 40);
    case 'frame/set':
      return (
        FRAME_IDS.includes(a.frameId as FrameId) && isMediaUrl(a.url) && (a.caption === null || isShortText(a.caption, 140))
      );
    case 'frame/clear':
      return FRAME_IDS.includes(a.frameId as FrameId);
    case 'music/load':
      return isMediaUrl(a.trackUrl) && isShortText(a.trackTitle, 120);
    case 'question/draw':
      return typeof a.questionId === 'string' && !!questionById(a.questionId);
    case 'question/answer':
      return isShortText(a.text, 600);
    case 'music/play':
    case 'music/pause':
    case 'focus/clear':
    case 'tv/power':
    case 'tv/play':
    case 'tv/pause':
    case 'pet/feed':
    case 'pet/pet':
    case 'fireplace/toggle':
    case 'sofa/toggle':
      return true;
    default:
      return false;
  }
}

export const isReactionKind = (k: unknown): k is ReactionKind => REACTIONS.includes(k as ReactionKind);
