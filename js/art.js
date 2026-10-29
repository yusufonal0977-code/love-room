// Piksel art yardımcıları ve karakter/evcil hayvan sprite'ları.
import { CHAR_DATA } from './char-data.js';
// Her şey koddan üretilir: satır dizileri + palet → otomatik dış hatlı küçük canvas'lar.

export const OUT = '#26160f';

export const R = (g, x, y, w, h, col) => {
  g.fillStyle = col;
  g.fillRect(x | 0, y | 0, w | 0, h | 0);
};

/** Satır dizisinden sprite üretir; dolu piksellerin boş komşularına dış hat çizer. */
export function sprite(rows, pal, outline = OUT) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w + 2; c.height = h + 2;
  const g = c.getContext('2d');
  const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++) {
      if (filled(x, y)) R(g, x + 1, y + 1, 1, 1, pal[rows[y][x]]);
      else if (outline && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) R(g, x + 1, y + 1, 1, 1, outline);
    }
  return c;
}

export function mirror(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
  return c;
}

// ---- Karakter paletleri (canlı tonlar) ----
export const SKIN = ['#ffe0c7', '#f1c09a', '#c98a5e', '#8a5638'];
export const HAIR = ['#2b1d16', '#6b3e22', '#c8742c', '#f2c14e', '#d9475a', '#f4efe6'];
export const SHIRT = ['#ff7a59', '#3fb7a4', '#5b8def', '#ffc93c', '#ff5d8f', '#2e2e3a'];
export const PANTS = ['#3b4a6b', '#2e2e3a', '#7a5a46'];
export const HAIR_STYLES = ['short', 'spiky', 'long', 'bob', 'bowl', 'round', 'none'];

export const DEFAULT_LOOK = { skin: 1, hair: 'short', hairColor: 1, shirt: 0, pants: 0, outfit: 'basic' };

// Karakterler tasarımcının çizimlerinden birebir gelir (js/char-data.js, tools/sprites/build_sprites.py).
// Kıyafet katmanı gövdeyi + kel kafayı + yüzü taşır; saç katmanı kafayı ve sarkan saçı üstüne koyar.
export const OUTFIT_IDS = Object.keys(CHAR_DATA.outfits);
const LINE = '#000000';
const LEGACY_HAIR = { bun: 'short' };

/** Bir görünüm için kod ızgarası: kıyafet + saç, ayak hizasından birleştirilmiş. */
function layers(look, view) {
  const outfit = CHAR_DATA.outfits[look.outfit] || CHAR_DATA.outfits.basic;
  const o = outfit.views[view];
  const hairId = LEGACY_HAIR[look.hair] || look.hair;
  const hair = hairId !== 'none' && CHAR_DATA.hairs[hairId] ? CHAR_DATA.hairs[hairId] : CHAR_DATA.hairs.short;
  const hv = hairId === 'none' ? null : hair.views[view];
  const ax = Math.max(o.ax, hv ? hv.ax : 0);
  const ox = ax - o.ax, hx = hv ? ax - hv.ax : 0;
  const w = Math.max(ox + o.rows[0].length, hv ? hx + hv.rows[0].length : 0), h = o.rows.length;
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const src = Array.from({ length: h }, () => Array(w).fill(''));
  o.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') { g[y][x + ox] = c; src[y][x + ox] = 'o'; } }));
  if (hv) hv.rows.forEach((r, y) => [...r].forEach((c, x) => {
    const X = x + hx;
    if (y >= h || c === '.') return;
    if (y < CHAR_DATA.headRows) { g[y][X] = c === '_' ? '.' : c; src[y][X] = 'h'; return; }
    if (c === 'h' && g[y][X] === '#') return; // saç kenarı kıyafet çizgisini ezmez
    g[y][X] = c === 'h' ? 'H' : c; src[y][X] = 'h';
  }));
  return { g, src, outfit, hair, view };
}

function paint(L, look, mapRow = (r) => r) {
  const skin = SKIN[look.skin] ?? SKIN[0];
  const col = {
    '#': LINE, S: skin, P: PANTS[look.pants] ?? PANTS[0], C: SHIRT[look.shirt] ?? SHIRT[0], H: HAIR[look.hairColor] ?? HAIR[0],
  };
  const rows = mapRow(L.g);
  const c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((r, y) => r.forEach((ch, x) => {
    if (ch === '.') return;
    let fill = col[ch];
    if (!fill) fill = L.src[y]?.[x] === 'h' ? L.hair.blush : L.outfit.pal[`${L.view}:${ch}`];
    R(g, x, y, 1, 1, fill || LINE);
  }));
  return c;
}

/** Oturma: bacaklar koltuğun içinde kalır; pantolonun ilk satırından sonrası kesilip altı kapatılır. */
function seated(g) {
  const top = g.findIndex((r) => r.includes('P'));
  if (top < 0) return g;
  const keep = g.slice(0, top + 2).map((r) => r.slice());
  keep[keep.length - 1] = keep[keep.length - 1].map((c) => (c === '.' ? '.' : '#'));
  return keep;
}

const cache = new Map();
/** Görünüme göre tüm yön karelerini üretir (önbellekli). Yürürken kare değişmez, karakter 1 px zıplar. */
export function characterSprites(look) {
  look = { ...DEFAULT_LOOK, ...(look || {}) };
  const key = JSON.stringify(look);
  if (cache.has(key)) return cache.get(key);
  const F = layers(look, 'front'), B = layers(look, 'back'), S = layers(look, 'side');
  const set = {};
  set.down = set.down2 = paint(F, look);
  set.up = set.up2 = paint(B, look);
  set.side = set.side2 = paint(S, look);
  set.sideL = set.side2L = mirror(set.side);
  set.sit = paint(F, look, seated);
  set.sitBack = paint(B, look, seated);
  set.hugR = set.kissR = set.side;
  set.hugL = set.kissL = set.sideL;
  const main = CHAR_DATA.outfits[look.outfit] ? Object.entries(CHAR_DATA.outfits[look.outfit].pal).find(([k]) => k.startsWith('back:'))?.[1] : null;
  set.pal = { c: main || (SHIRT[look.shirt] ?? SHIRT[0]), s: SKIN[look.skin] ?? SKIN[0] };
  cache.set(key, set);
  return set;
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ---- Güneş ve ay rozetleri (karakterin başının üstünde) ----
export const SUN_BADGE = sprite(
  ['..y.y..', '.yyyyy.', 'yyYYYyy', '.yYYYy.', 'yyYYYyy', '.yyyyy.', '..y.y..'],
  { y: '#fcdf4b', Y: '#ffef9a' },
);
export const MOON_BADGE = sprite(
  ['..mmm..', '.mmm...', 'mmm....', 'mmm....', 'mmm....', '.mmm...', '..mmm..'],
  { m: '#fff6d8' },
);

// ---- Kedi (16×10; odada kolay görünsün diye karakterin yarısı boyunda) ----
const LEGS_A = ['..kk.kk..kk.kk..', '..kk.kk..kk.kk..'];
const LEGS_B = ['...kk.kk..kk.kk.', '..kk...kk.kk..k.'];
const CAT_BODY = ['..........k...k.', '..........kk.kk.', '.k........kkkkk.', 'k.........kekek.', 'k.........kkwkk.', '.kkkkkkkkkkkkk..', '.kkkkkkkkkkkkk..', '..kkwwwwwwkkk...'];
const CAT = [[...CAT_BODY, ...LEGS_A], [...CAT_BODY, ...LEGS_B]];
const CAT_SIT = ['..k...k...', '..kk.kk...', '..kkkkk...', '..kekek...', '..kkwkk...', '.kkkkkkk..', '.kkwwwkk..', '.kkwwwkk.k', '.kkkkkkkkk', '..kk.kk...'];
export function catSprites(color = '#f0a050') {
  const pal = { k: color, e: '#2b1d16', w: '#fff1e2' };
  const right = CAT.map((r) => sprite(r, pal));
  return { right, left: right.map(mirror), sit: sprite(CAT_SIT, pal) };
}

// ---- Kalp parçacıkları (sarılma/öpücük animasyonu) ----
export const HEART = sprite(['.r.r.', 'rRrrr', 'rrrrr', '.rrr.', '..r..'], { r: '#ff4f7b', R: '#ffb3c6' });
export const HEART_BIG = sprite(
  ['.rr...rr.', 'rRRr.rrrr', 'rRrrrrrrr', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..', '...rrr...', '....r....'],
  { r: '#ff4f7b', R: '#ffc2d1' },
);
export const SPARK = sprite(['.y.', 'yYy', '.y.'], { y: '#ffd27a', Y: '#fff6c8' }, null);

// ---- Evcil hayvanlar: kedi, köpek, tavşan (sağa bakan 2 yürüme karesi + oturma) ----
// head: aksesuarın takılacağı baş noktası (sprite içi piksel, dış hat dahil), [sağ, oturma]
const DOG_BODY = ['..........kkkk..', '.........kkkkkk.', 'k.......DDkkekkn', 'k.......DDkkkkkk', '.k.......Dkkkk..', '.kkkkkkkkkkkkk..', '.kkkkkkkkkkkkk..', '..kkwwwwwwkkk...'];
const BUNNY_BODY = ['..........k.k...', '..........k.k...', '..........kkkk..', '.........kkekkk.', '..kkkkkkkkkkkkn.', 'wkkkkkkkkkkkk...', 'wkkkkkkkkkkkk...', '.kkkkkkkkkkk....'];
const PETS = {
  cat: { walk: CAT, sit: CAT_SIT, head: [[13, 1], [5, 1]] },
  dog: {
    walk: [[...DOG_BODY, ...LEGS_A], [...DOG_BODY, ...LEGS_B]],
    sit: ['...kkkk...', '..kkkkkk..', '.DkekkekD.', '.DkkknkkD.', '..kkkkkk..', '.kkkkkkkk.', '.kkwwwwkk.', '.kkwwwwkk.', '.kkkkkkkkk', '..kk..kk..'],
    head: [[12, 1], [5, 1]],
  },
  bunny: {
    walk: [[...BUNNY_BODY, '..kkk....kkk....', '.kkk....kkk.....'], [...BUNNY_BODY, '...kkk..kkk.....', '..kkk..kkk......']],
    sit: ['..k.k.....', '..k.k.....', '..k.k.....', '.kkkkk....', '.kekek....', '.kknkk....', 'kkkkkkk...', 'kkkkkkkk..', 'kkwwkkkkw.', '.kk..kk...'],
    head: [[12, 1], [3, 1]],
  },
};
export const PET_SPECIES = ['cat', 'dog', 'bunny'];
export const PET_COLORS = ['#f0a050', '#3a3330', '#f4efe6', '#9a9aa6', '#c8742c', '#e8c9a0'];
/** Aksesuar: [ad, açılış seviyesi] */
export const PET_ACC = [['none', 1], ['bow', 1], ['collar', 2], ['hat', 4], ['crown', 8]];
const petCache = new Map();
export function petSprites(species = 'cat', color = PET_COLORS[0]) {
  const key = species + color;
  if (petCache.has(key)) return petCache.get(key);
  const d = PETS[species] || PETS.cat;
  const pal = { k: color, D: shade(color, -0.3), e: '#2b1d16', n: '#2b1d16', w: '#fff1e2' };
  const right = d.walk.map((r) => sprite(r, pal));
  const set = { right, left: right.map(mirror), sit: sprite(d.sit, pal), head: d.head, w: right[0].width };
  petCache.set(key, set);
  return set;
}
/** Aksesuarı (x, y) baş noktasına çizer. */
export function drawPetAcc(g, acc, x, y) {
  const P = (dx, dy, w, h, c) => R(g, x + dx, y + dy, w, h, c);
  if (acc === 'bow') { P(-2, -2, 2, 2, '#ff4f7b'); P(1, -2, 2, 2, '#ff4f7b'); P(0, -2, 1, 1, '#ffb3c6'); }
  if (acc === 'hat') { P(-2, -2, 5, 1, '#26160f'); P(-1, -5, 3, 3, '#26160f'); P(-1, -3, 3, 1, '#e0473f'); }
  if (acc === 'crown') { P(-2, -3, 5, 2, '#ffc93c'); P(-2, -4, 1, 1, '#ffc93c'); P(0, -4, 1, 1, '#ffc93c'); P(2, -4, 1, 1, '#ffc93c'); P(0, -2, 1, 1, '#ff4f7b'); }
  if (acc === 'collar') { P(-2, 3, 4, 1, '#e0473f'); P(-1, 4, 1, 1, '#ffc93c'); }
}
