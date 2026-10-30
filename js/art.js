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
// Beden: tasarımda yanağı pembe çizilen modeller kız. Kız erkekten 2 piksel kısa (tasarımcının kız tabanı 29 satır).
const HEIGHT = { f: 29, m: 31 };
const BLUSH_AT = { front: [[12, 4], [12, 13]], side: [[12, 10]], back: [] }; // kel kafa koordinatı (satır, sütun)
const BLUSH = '#ef9090';
/** Kayıtlı bedeni yoksa eski profiller için tahmin: kız saçı ya da kız kıyafeti → kız. */
export function bodyOf(look) {
  if (look?.body === 'f' || look?.body === 'm') return look.body;
  return ['long', 'bob', 'bowl', 'round'].includes(look?.hair) || ['nordicPink', 'tee', 'cardiganBeige'].includes(look?.outfit) ? 'f' : 'm';
}
/** Boyu bacaklardan ayarlar: aynı olan ardışık satırlardan (düz pantolon, bacak arası) biri silinir ya da çoğaltılır;
 *  böylece çizimdeki şekil bozulmaz, yalnızca bacak kısalır/uzar. Önce düz pantolon satırları, sonra bacak arası. */
function fitHeight(L, target) {
  const key = (y) => L.g[y].join('');
  const runs = () => {
    const out = [];
    for (let y = 22; y < L.g.length - 1; y++) {
      let e = y;
      while (e + 1 < L.g.length - 1 && key(e + 1) === key(y)) e++;
      if (L.g[y].includes('P')) out.push([y, e - y + 1]);
      y = e;
    }
    return out;
  };
  let guard = 8;
  while (L.g.length !== target && guard--) {
    const r = runs();
    if (!r.length) break;
    if (L.g.length > target) {
      const pick = r.find(([, n]) => n >= 2) || null; // en üstteki tekrar eden satır grubu
      if (!pick) break;
      L.g.splice(pick[0], 1); L.src.splice(pick[0], 1);
    } else {
      const [y] = r[0];
      L.g.splice(y, 0, L.g[y].slice()); L.src.splice(y, 0, L.src[y].slice());
    }
  }
}

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
  const dy = hv?.dy || 0; // bazı arka çizimlerde kafa daha alçakta: üstte kalan kel kafa satırları silinir
  for (let y = 0; y < dy; y++) g[y].fill('.');
  if (hv) hv.rows.forEach((r, y0) => [...r].forEach((c, x) => {
    const X = x + hx, y = y0 + dy;
    if (y >= h || c === '.') return;
    if (y < CHAR_DATA.headRows) { g[y][X] = c === '_' ? '.' : c; src[y][X] = 'h'; return; }
    if (c === 'h' && g[y][X] === '#') return; // saç kenarı kıyafet çizgisini ezmez
    g[y][X] = c === 'h' ? 'H' : c; src[y][X] = 'h';
  }));
  const body = bodyOf(look);
  for (const [y, x] of BLUSH_AT[view]) {
    const X = x + ox, c = g[y]?.[X];
    if (c === undefined || c === '#' || c === 'H') continue;
    if (body === 'f') { if (c === 'S') { g[y][X] = 'B'; src[y][X] = ''; } } // çizimde yanak varsa kendi rengi kalır
    else { g[y][X] = 'S'; src[y][X] = ''; }
  }
  const L = { g, src, outfit, hair, view };
  fitHeight(L, HEIGHT[body]);
  return L;
}

function paint(L, look, mapRow = (r) => r) {
  const skin = SKIN[look.skin] ?? SKIN[0];
  const col = {
    '#': LINE, B: BLUSH, S: skin, P: PANTS[look.pants] ?? PANTS[0], C: SHIRT[look.shirt] ?? SHIRT[0], H: HAIR[look.hairColor] ?? HAIR[0],
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

/** Yürüme karesi: bir bacağın ayak çizgisi bir satır yukarı alınır (o ayak kalkmış gibi).
 *  Bacaklar son satırın üstündeki satırdaki iç çizgiden ikiye ayrılır; side = 'L' sol, 'R' sağ bacak. */
function step(side) {
  return (g) => {
    const out = g.map((r) => r.slice()), h = g.length;
    const lines = g[h - 2].map((c, x) => (c === '#' ? x : -1)).filter((x) => x >= 0);
    if (lines.length < 3) return out;
    const split = lines.length >= 4 ? (lines[1] + lines[lines.length - 2]) / 2 : lines[1];
    for (let x = 0; x < out[0].length; x++) {
      if (side === 'L' ? x >= split : x <= split) continue;
      out[h - 3][x] = g[h - 1][x]; // ayak iki satır yukarıda: adım belirgin olsun
      out[h - 2][x] = '.';
      out[h - 1][x] = '.';
    }
    return out;
  };
}

/** Yandan yürüme: alt üç satır (ayaklar) bir piksel geri ya da ileri kayar. */
function swing(dx) {
  return (g) => g.map((r, y) => {
    if (y < g.length - 3) return r.slice();
    const out = r.map(() => '.');
    r.forEach((c, x) => { if (c !== '.' && x + dx >= 0 && x + dx < r.length) out[x + dx] = c; });
    return out;
  });
}

const cache = new Map();
/** Görünüme göre tüm yön karelerini üretir (önbellekli). Duran kare çizimin aynısı; yürürken ayaklar sırayla kalkar. */
export function characterSprites(look) {
  look = { ...DEFAULT_LOOK, ...(look || {}) };
  const key = JSON.stringify(look);
  if (cache.has(key)) return cache.get(key);
  const F = layers(look, 'front'), B = layers(look, 'back'), S = layers(look, 'side');
  const set = {};
  set.down = paint(F, look); set.down2 = paint(F, look, step('L')); set.down3 = paint(F, look, step('R'));
  set.up = paint(B, look); set.up2 = paint(B, look, step('L')); set.up3 = paint(B, look, step('R'));
  set.side = paint(S, look); set.side2 = paint(S, look, swing(-1)); set.side3 = paint(S, look, swing(1));
  set.sideL = mirror(set.side); set.side2L = mirror(set.side2); set.side3L = mirror(set.side3);
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
  // Rakun: gri gövde, açık gri yüz, koyu göz maskesi içinde beyaz parıltı, halkalı kuyruk (t koyu halka)
  raccoon: {
    walk: [
      ['..........k...k.', 'tt........kkkkk.', 'tt........mmlmm.', 'kk........emlme.', 'kkt.......llnll.', '.ttkkkkkkkkkkk..', '..kkkkkkkkkkkk..', '...kkllllllkkk..', '...kk.kk..kk.kk.', '...mm.mm..mm.mm.'],
      ['..........k...k.', 'tt........kkkkk.', 'tt........mmlmm.', 'kk........emlme.', 'kkt.......llnll.', '.ttkkkkkkkkkkk..', '..kkkkkkkkkkkk..', '...kkllllllkkk..', '....kk.kk..kk.kk', '....mm.mm..mm.mm'],
    ],
    sit: ['..k...k...', '..kkkkk...', '..mmlmm...', '..emlme..t', '..llnll.tt', '.kkkkkkkkk', '.kklllkktt', '.kklllkk..', '.kkkkkkk..', '..mm.mm...'],
    head: [[13, 1], [5, 1]],
    pal: { e: '#ffffff', l: '#e4e7ec', m: '#3a3a40', t: '#3a3a40', n: '#2b1d16' },
  },
};
export const PET_SPECIES = ['cat', 'dog', 'bunny', 'raccoon'];
// Siyah (Pascal) ve rakun grisi sona eklendi; eski renklerin sırası değişmesin
export const PET_BLACK = '#1f1c24', PET_RACCOON = '#98a2ae';
export const PET_COLORS = ['#f0a050', '#3a3330', '#f4efe6', '#9a9aa6', '#c8742c', '#e8c9a0', PET_BLACK, PET_RACCOON];
/** Varsayılan ilk evcil hayvan: siyah kedi Pascal. */
export const DEFAULT_PET = { name: 'Pascal', species: 'cat', color: PET_BLACK };
/** Aksesuar: [ad, açılış seviyesi] */
export const PET_ACC = [['none', 1], ['bow', 1], ['collar', 2], ['hat', 4], ['crown', 8]];
const petCache = new Map();
export function petSprites(species = 'cat', color = PET_COLORS[0]) {
  const key = species + color;
  if (petCache.has(key)) return petCache.get(key);
  const d = PETS[species] || PETS.cat;
  const pal = { k: color, D: shade(color, -0.3), e: '#2b1d16', n: '#2b1d16', w: '#fff1e2', ...(d.pal || {}) };
  // Siyah kedide koyu göz görünmez: sarı gözler, kömür grisi göğüs
  if (color === PET_BLACK && !d.pal) Object.assign(pal, { e: '#f2d14a', n: '#6b6470', w: '#3b3642', D: '#120f16' });
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
