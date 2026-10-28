// Dekor: ortak çizim parçaları, dekor dolabındaki yerleştirilebilir eşyalar ve oda boyası hazır temaları.
// Eşya konumu "ayak" noktasıdır (alt orta). Duvar eşyaları duvara asılır ve yürümeyi engellemez.
import { R } from './art.js';

export const C = {
  wood: '#a8683c', woodL: '#c98a55', woodD: '#7a4426', dark: '#3a2418',
  leaf: '#4fbf6a', leaf2: '#2e8a4e', pot: '#e0794a', pot2: '#b8552f',
  cream: '#fff3dc', cream2: '#f1dfbf', metal: '#3a3330', gold: '#ffc93c',
};

export function plant(g, x, y, big) {
  const s = big ? 1 : 0.7;
  R(g, x - 6 * s, y - 10 * s, 12 * s, 10 * s, C.pot); R(g, x - 6 * s, y - 10 * s, 12 * s, 2, '#f39a6a'); R(g, x - 5 * s, y - 2, 10 * s, 2, C.pot2);
  R(g, x - 10 * s, y - 24 * s, 8 * s, 12 * s, C.leaf); R(g, x + 2 * s, y - 26 * s, 9 * s, 14 * s, C.leaf2); R(g, x - 4 * s, y - 32 * s, 7 * s, 12 * s, C.leaf);
  R(g, x - 8 * s, y - 22 * s, 2, 6, '#8be08f');
}

/** Dekor dolabı. block: ayak noktasına göre çarpışma kutusu; seat: oturulabilir; light: gece ışığı. */
export const CATALOG = {
  plant: { name: 'Büyük saksı', w: 20, h: 34, block: [-8, -6, 16, 6], draw: (g, x, y) => plant(g, x, y, true) },
  cactus: {
    name: 'Kaktüs', w: 12, h: 20, block: [-5, -4, 10, 4],
    draw(g, x, y) { R(g, x - 5, y - 7, 10, 7, '#e0794a'); R(g, x - 5, y - 7, 10, 1, '#f39a6a'); R(g, x - 2, y - 19, 4, 12, '#3fae5a'); R(g, x - 5, y - 15, 3, 2, '#3fae5a'); R(g, x - 5, y - 17, 2, 3, '#3fae5a'); R(g, x + 2, y - 13, 3, 2, '#3fae5a'); R(g, x + 3, y - 16, 2, 4, '#3fae5a'); R(g, x - 1, y - 21, 2, 2, '#ff5d8f'); },
  },
  flowers: {
    name: 'Çiçekli saksı', w: 14, h: 20, block: [-6, -4, 12, 4],
    draw(g, x, y) { R(g, x - 6, y - 8, 12, 8, '#5b8def'); R(g, x - 6, y - 8, 12, 1, '#8fb0ff'); for (let i = 0; i < 5; i++) { const fx = x - 6 + i * 3, fy = y - 14 - (i % 2) * 3; R(g, fx + 1, fy + 2, 1, 6, '#2e8a4e'); R(g, fx, fy, 3, 3, ['#ff5d8f', '#ffc93c', '#fff3dc', '#ff7a59', '#c78bff'][i]); } },
  },
  beanbag: {
    name: 'Puf', w: 20, h: 14, block: [-9, -6, 18, 6], seat: { dx: 0, dy: -2 },
    draw(g, x, y) { R(g, x - 10, y - 10, 20, 10, '#ff5d8f'); R(g, x - 8, y - 13, 16, 4, '#ff7aa3'); R(g, x - 6, y - 12, 8, 2, '#ffa3c0'); R(g, x - 10, y - 2, 20, 2, '#d9406e'); },
  },
  floorlamp: {
    name: 'Ayaklı lamba', w: 12, h: 40, block: [-5, -3, 10, 3],
    draw(g, x, y, info) { R(g, x - 1, y - 32, 2, 30, C.metal); R(g, x - 5, y - 3, 10, 3, C.metal); R(g, x - 6, y - 40, 12, 9, info?.night > 0.1 ? '#ffe08a' : '#f6d6a0'); R(g, x - 5, y - 40, 10, 1, '#fff6c8'); },
    light: (x, y) => ({ x, y: y - 34, r: 56, a: 0.9, color: '255,190,110' }),
  },
  rug: {
    name: 'Yuvarlak halı', w: 40, h: 16, flat: true,
    draw(g, x, y) { R(g, x - 18, y - 14, 36, 14, '#c78bff'); R(g, x - 20, y - 11, 40, 8, '#c78bff'); R(g, x - 14, y - 11, 28, 8, '#ffd27a'); R(g, x - 8, y - 9, 16, 4, '#ff7a59'); },
  },
  teddy: {
    name: 'Oyuncak ayı', w: 12, h: 14, block: [-5, -3, 10, 3],
    draw(g, x, y) { const b = '#c8874f'; R(g, x - 5, y - 8, 10, 8, b); R(g, x - 4, y - 14, 8, 7, b); R(g, x - 5, y - 15, 3, 3, b); R(g, x + 2, y - 15, 3, 3, b); R(g, x - 2, y - 11, 1, 1, '#2b1d16'); R(g, x + 1, y - 11, 1, 1, '#2b1d16'); R(g, x - 1, y - 9, 2, 2, '#f1c09a'); R(g, x - 3, y - 6, 6, 2, '#ff5d8f'); },
  },
  guitar: {
    name: 'Gitar', w: 10, h: 26, block: [-4, -3, 8, 3],
    draw(g, x, y) { R(g, x - 4, y - 10, 8, 9, '#e0873a'); R(g, x - 3, y - 15, 6, 6, '#e0873a'); R(g, x - 1, y - 9, 2, 2, '#3a2418'); R(g, x - 1, y - 26, 2, 12, C.woodD); R(g, x - 2, y - 27, 4, 3, C.dark); R(g, x - 4, y - 2, 8, 1, '#b8652a'); },
  },
  aquarium: {
    name: 'Akvaryum', w: 26, h: 26, block: [-12, -4, 24, 4],
    draw(g, x, y, info) {
      R(g, x - 12, y - 8, 24, 8, C.woodD); R(g, x - 12, y - 24, 24, 16, '#7fd4ff'); R(g, x - 12, y - 24, 24, 2, '#c8f0ff'); R(g, x - 11, y - 10, 22, 2, '#e8d29a');
      const t = info?.t ?? 0;
      R(g, x - 8 + Math.round(Math.sin(t) * 6), y - 19, 4, 2, '#ff7a59'); R(g, x + 2 + Math.round(Math.cos(t * 0.8) * 5), y - 15, 3, 2, '#ffc93c');
      R(g, x - 9, y - 14, 1, 4, '#2e8a4e'); R(g, x + 8, y - 15, 1, 5, '#2e8a4e');
    },
    light: (x, y) => ({ x, y: y - 16, r: 24, a: 0.6, color: '120,200,255' }),
  },
  books: {
    name: 'Kitap yığını', w: 12, h: 12, block: [-5, -3, 10, 3],
    draw(g, x, y) { R(g, x - 6, y - 4, 12, 4, '#5b8def'); R(g, x - 5, y - 8, 10, 4, '#ff7a59'); R(g, x - 6, y - 11, 11, 3, '#ffc93c'); R(g, x - 6, y - 1, 12, 1, '#2f5d8f'); },
  },
  candles: {
    name: 'Mumlar', w: 12, h: 10, flat: false,
    draw(g, x, y, info) { const f = (info?.t ?? 0) * 8; [[-4, 6], [0, 9], [4, 5]].forEach(([dx, hh], i) => { R(g, x + dx - 1, y - hh, 3, hh, '#fff3dc'); R(g, x + dx, y - hh - 2 - (Math.sin(f + i) > 0 ? 1 : 0), 1, 2, '#ffb347'); }); },
    light: (x, y) => ({ x, y: y - 8, r: 30, a: 0.85, color: '255,170,80' }),
  },
  balloons: {
    name: 'Kalp balonlar', w: 16, h: 34,
    draw(g, x, y, info) { const b = Math.round(Math.sin((info?.t ?? 0) * 2)); [[-5, '#ff5d8f'], [4, '#ff7a59'], [0, '#ffc93c']].forEach(([dx, c], i) => { const by = y - 30 - i * 3 + b; R(g, x + dx - 3, by, 3, 3, c); R(g, x + dx, by, 3, 3, c); R(g, x + dx - 2, by + 3, 4, 2, c); R(g, x + dx - 1, by + 5, 2, 1, c); R(g, x + dx, by + 6, 1, y - by - 7, '#d8c39b'); }); R(g, x - 2, y - 2, 4, 2, C.metal); },
  },
  poster: {
    name: 'Poster', w: 18, h: 24, wall: true,
    draw(g, x, y) { R(g, x - 9, y - 24, 18, 24, '#fff3dc'); R(g, x - 8, y - 23, 16, 22, '#ff9e7a'); R(g, x - 8, y - 9, 16, 8, '#5b3a8a'); R(g, x - 3, y - 18, 6, 6, '#fff1a8'); R(g, x - 7, y - 6, 4, 1, '#fff3dc'); R(g, x - 7, y - 4, 8, 1, '#fff3dc'); },
  },
  fairy: {
    name: 'Işık zinciri', w: 40, h: 8, wall: true,
    draw(g, x, y, info) { for (let i = 0; i < 8; i++) { const lx = x - 20 + i * 5, ly = y - 6 + Math.round(Math.sin(i / 7 * Math.PI) * 3); R(g, lx, ly, 2, 2, (Math.sin((info?.t ?? 0) * 3 + i) > -0.3) ? ['#ffd27a', '#ff7aa3', '#8fd0ff'][i % 3] : '#8a7a60'); } },
    light: (x, y) => ({ x, y: y - 4, r: 34, a: 0.6, color: '255,200,140' }),
  },
  disco: {
    name: 'Disko topu', w: 12, h: 18, wall: true,
    draw(g, x, y, info) { R(g, x, y - 18, 1, 6, C.metal); const k = Math.floor((info?.t ?? 0) * 4) % 2; for (let iy = 0; iy < 3; iy++) for (let ix = 0; ix < 3; ix++) R(g, x - 4 + ix * 3, y - 12 + iy * 3, 3, 3, (ix + iy + k) % 2 ? '#e8ecf4' : '#9aa6c0'); },
    light: (x, y, info) => ({ x, y: y - 8, r: 60, a: 0.5, color: ['255,120,200', '120,200,255', '255,220,120'][Math.floor((info?.t ?? 0) * 2) % 3] }),
  },
  painting: {
    name: 'Küçük tablo', w: 16, h: 14, wall: true,
    draw(g, x, y) { R(g, x - 8, y - 14, 16, 14, C.woodD); R(g, x - 6, y - 12, 12, 10, '#bfe8ff'); R(g, x - 6, y - 6, 12, 4, '#4fbf6a'); R(g, x + 1, y - 11, 3, 3, '#fff1a8'); },
  },
};

/** Oda boyası için hazır temalar (duvar, desen rengi, zemin). */
export const THEMES = [
  { name: 'Mercan', wall: '#ff9a76', accent: '#ffb999', floor: '#c98a55' },
  { name: 'Pembe şeker', wall: '#ff9ec4', accent: '#ffc4dc', floor: '#d9a07a' },
  { name: 'Gece mavisi', wall: '#2f3f8f', accent: '#4a5db0', floor: '#7a5238' },
  { name: 'Orman', wall: '#2e7d5b', accent: '#3f9a72', floor: '#8a5a36' },
  { name: 'Lavanta', wall: '#b39ddb', accent: '#cbb8ec', floor: '#c49a72' },
  { name: 'Gün batımı', wall: '#ff8a4c', accent: '#ffb07a', floor: '#a8683c' },
  { name: 'Nane', wall: '#8fe0c8', accent: '#b4ecdb', floor: '#e0b07a' },
  { name: 'Limon', wall: '#ffe066', accent: '#fff0a6', floor: '#c98a55' },
  { name: 'Turkuaz', wall: '#1f7a7a', accent: '#2f9a95', floor: '#8a4f2c' },
  { name: 'Krem', wall: '#f6e7cf', accent: '#fff6e6', floor: '#b07a4e' },
];
export const MOTIFS = [['diamond', 'Baklava'], ['dots', 'Puantiye'], ['stripes', 'Çizgili'], ['plain', 'Düz'], ['hearts', 'Kalpli']];
