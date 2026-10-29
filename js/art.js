// Piksel art yardımcıları ve karakter/evcil hayvan sprite'ları.
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
export const HAIR_STYLES = ['short', 'long', 'bob', 'bun', 'none'];

export const DEFAULT_LOOK = { skin: 1, hair: 'short', hairColor: 1, shirt: 0, pants: 0 };

// 14×21 tombul kafalı karakter (çizilmiş modele göre). s ten, e göz, b yanak, m ağız, o iç çizgi,
// c/C kıyafet, p pantolon, w ayakkabı. Saç ayrı maskeyle eklenir.
const HEAD_FRONT = ['....ssssss....', '..ssssssssss..', '.ssssssssssss.', '.ssssssssssss.', '.ssssssssssss.', '.ssssssssssss.', '.sseesssseess.', '.ssbessssebss.', '..ssssmmssss..', '...ssssssss...', '.....ssss.....'];
const HEAD_BACK = HEAD_FRONT.map((r, y) => (y >= 6 && y <= 8 ? r.replace(/[ebm]/g, 's') : r));
const HEAD_SIDE = ['....ssssss....', '..ssssssssss..', '.ssssssssssss.', '.ssssssssssss.', '.ssssssssssss.', '.ssssssssssss.', '.sssssssssees.', '.sssssssssbes.', '..ssssssssss..', '...ssssssss...', '......sss.....'];
const TORSO = ['...cccccccc...', '..cccccccccc..', '..coccccccoc..', '..coccccccoc..', '..soCCCCCCos..'];
const TORSO_SIDE = ['.....ccccc....', '.....ccccc....', '.....ccocc....', '.....ccocc....', '.....ccosc....'];
const LEGS = ['....pppppp....', '....pppppp....', '....ppoopp....', '....ppoopp....', '....wwooww....'];
const LEGS2 = ['....pppppp....', '....pppppp....', '....ppoopp....', '....wwoopp....', '........ww....'];
const LEGS_SIDE = ['.....ppppp....', '.....ppppp....', '.....ppppp....', '.....ppppp....', '.....wwwww....'];
const LEGS_SIDE2 = ['.....ppppp....', '....pppppp....', '....pp...pp...', '....pp...pp...', '...ww....ww...'];
const SIT_LEGS = ['...pppppppp...', '...pppppppp...', '...ww....ww...', '..............', '..............'];
const EMPTY5 = Array(5).fill('..............');
const BODY = {
  down: [...HEAD_FRONT, ...TORSO, ...LEGS],
  down2: [...HEAD_FRONT, ...TORSO, ...LEGS2],
  up: [...HEAD_BACK, ...TORSO, ...LEGS],
  up2: [...HEAD_BACK, ...TORSO, ...LEGS2],
  side: [...HEAD_SIDE, ...TORSO_SIDE, ...LEGS_SIDE],
  side2: [...HEAD_SIDE, ...TORSO_SIDE, ...LEGS_SIDE2],
  sit: [...HEAD_FRONT, ...TORSO, ...SIT_LEGS],
  sitBack: [...HEAD_BACK, ...TORSO, ...EMPTY5],
};

// Saç maskeleri: h = saç, * = yalnızca tenin üstüne saç, . = dokunma
const FULL = '**************';
const HAIR_MASKS = {
  short: {
    front: ['....hhhhhh....', '..hhhhhhhhhh..', FULL, FULL, '.hhh.hhhh.hhh.', '.h..........h.'],
    back: Array(9).fill(FULL),
    side: [FULL, FULL, FULL, FULL, '**********....', '******........', '*****.........', '****..........', '***...........'],
  },
  long: {
    front: [FULL, FULL, FULL, FULL, '.hh........hh.', ...Array(5).fill('hhh........hhh'), ...Array(7).fill('hh..........hh')],
    back: [FULL, FULL, ...Array(15).fill('hhhhhhhhhhhhhh')],
    side: [FULL, FULL, FULL, FULL, FULL, ...Array(12).fill('hhhhh*........')],
  },
  bob: {
    front: [FULL, FULL, FULL, FULL, '.hhhhhhhhhhhh.', ...Array(4).fill('hhh........hhh'), '.hhh......hhh.'],
    back: [FULL, FULL, ...Array(8).fill('hhhhhhhhhhhhhh'), '.hhhhhhhhhhhh.'],
    side: [FULL, FULL, FULL, FULL, FULL, ...Array(4).fill('hhhhhhhh......'), '.hhhhhhh......', '.hhhhhh.......'],
  },
};
HAIR_MASKS.bun = HAIR_MASKS.short;

function withHair(rows, style, key) {
  const view = key.startsWith('side') || key.startsWith('hug') || key.startsWith('kiss') ? 'side' : key === 'up' || key === 'up2' || key === 'sitBack' ? 'back' : 'front';
  const mask = HAIR_MASKS[style]?.[view] || [];
  const r = rows.map((row, y) => {
    const m = mask[y];
    if (!m) return row;
    return [...row].map((c, x) => (m[x] === 'h' || (m[x] === '*' && c === 's') ? 'h' : c)).join('');
  });
  if (style === 'bun') r.unshift('.....hhhh.....', '....hhhhhh....');
  return r;
}

const cache = new Map();
/** Görünüme göre tüm yön/yürüme karelerini üretir (önbellekli). */
export function characterSprites(look) {
  look = { ...DEFAULT_LOOK, ...(look || {}) };
  const key = JSON.stringify(look);
  if (cache.has(key)) return cache.get(key);
  const shirt = SHIRT[look.shirt] ?? SHIRT[0];
  const skin = SKIN[look.skin] ?? SKIN[0];
  const pal = {
    h: HAIR[look.hairColor] ?? HAIR[0],
    s: skin,
    e: '#1c1310',
    m: '#1c1310',
    b: '#ff9d8a',
    o: OUT,
    c: shirt,
    C: shade(shirt, -0.22),
    p: PANTS[look.pants] ?? PANTS[0],
    w: '#3a2a22',
    l: shade(skin, -0.45), // kapalı göz
    r: '#e0475e', // dudak
  };
  const set = { pal };
  for (const [k, rows] of Object.entries(BODY)) set[k] = sprite(withHair(rows, look.hair, k), pal);
  set.sideL = mirror(set.side);
  set.side2L = mirror(set.side2);
  // Sarılma: gözler kapalı. Öpücük: gözler kapalı + dudaklar öne uzanmış.
  const closed = BODY.side.map((row, y) => (y === 6 ? row.replace(/e/g, 'l') : y === 7 ? row.replace('e', 's') : row));
  set.hugR = sprite(withHair(closed, look.hair, 'hug'), pal);
  set.hugL = mirror(set.hugR);
  set.kissR = sprite(withHair(closed.map((row, y) => (y === 8 ? row.slice(0, 12) + 'r' + row.slice(13) : row)), look.hair, 'kiss'), pal);
  set.kissL = mirror(set.kissR);
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
