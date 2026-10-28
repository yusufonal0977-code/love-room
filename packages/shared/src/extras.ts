// 3. faz: çiçek büyütme, mini oyunlar, oda stilleri; günlük ve albüm kayıtları.

// ---- Oda stilleri ----

export const ROOM_STYLES = ['cream', 'terracotta', 'forest', 'blush', 'midnight'] as const;
export type RoomStyle = (typeof ROOM_STYLES)[number];

// ---- Çiçek ----

export const FLOWER_KINDS = ['tulip', 'rose', 'sunflower', 'daisy'] as const;
export type FlowerKind = (typeof FLOWER_KINDS)[number];

/** Büyüme puanı eşikleri: tohum → filiz → fide → tomurcuk → çiçek → tam açmış. */
export const FLOWER_STAGES = [0, 2, 5, 9, 14, 20] as const;
/** Aynı kişi en erken bu kadar sonra tekrar sulayabilir. */
export const WATER_COOLDOWN_MS = 20 * 60 * 60 * 1000;
/** İkiniz de bu süre içinde sularsanız ek büyüme puanı. */
export const TOGETHER_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Bu kadar süre sulanmazsa çiçek boynunu büker (ölmez, sulayınca toparlanır). */
export const WILT_AFTER_MS = 48 * 60 * 60 * 1000;

export interface FlowerState {
  kind: FlowerKind;
  plantedAt: number;
  growth: number;
  lastWatered: Record<string, number>;
  bloomedAt: number | null;
}

export function flowerStage(growth: number): number {
  let stage = 0;
  FLOWER_STAGES.forEach((t, i) => {
    if (growth >= t) stage = i;
  });
  return stage;
}

export function flowerWilted(f: FlowerState, now: number): boolean {
  const last = Math.max(f.plantedAt, ...Object.values(f.lastWatered));
  return now - last > WILT_AFTER_MS;
}

// ---- Mini oyunlar ----

export type GameKind = 'xox' | 'memory';

export const MEMORY_CARDS = ['💖', '🌹', '🐱', '🎬', '☕', '🌙'] as const;

export interface XoxGame {
  kind: 'xox';
  players: string[];
  /** Hücrede hamleyi yapan kullanıcının id'si. */
  board: (string | null)[];
  turn: string;
  /** Kazananın id'si, 'draw' ya da devam ediyorsa null. */
  winner: string | null;
  startedAt: number;
}

export interface MemoryGame {
  kind: 'memory';
  players: string[];
  deck: string[];
  /** Şu an açık (eşleşmemiş) kartların indeksleri; en fazla 2. */
  open: number[];
  matched: number[];
  turn: string;
  scores: Record<string, number>;
  startedAt: number;
}

export type GameState = XoxGame | MemoryGame;

/** Tohumlu karıştırma: iki cihazda ve sunucuda aynı desteyi üretir. */
export function shuffledDeck(seed: number): string[] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const deck = [...MEMORY_CARDS, ...MEMORY_CARDS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const XOX_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
];

export function xoxWinner(board: (string | null)[]): string | null {
  for (const [a, b, c] of XOX_LINES) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return board.every(Boolean) ? 'draw' : null;
}

export function gameOver(g: GameState): boolean {
  return g.kind === 'xox' ? g.winner !== null : g.matched.length === g.deck.length;
}

// ---- Günlük ve albüm (ayrı tabloda saklanır, oda durumuna girmez) ----

export const DIARY_MOODS = ['🥰', '😊', '😌', '🥺', '😴', '🤩'] as const;

export interface DiaryEntry {
  id: string;
  authorId: string;
  text: string;
  mood: string | null;
  createdAt: number;
}

export interface AlbumPhoto {
  id: string;
  authorId: string;
  url: string;
  caption: string | null;
  createdAt: number;
}
