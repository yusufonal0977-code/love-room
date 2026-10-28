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
export const HAIR_STYLES = ['short', 'long', 'bun'];

export const DEFAULT_LOOK = { skin: 1, hair: 'short', hairColor: 1, shirt: 0, pants: 0 };

// 12×18 karakter kareleri (h saç, s ten, e göz, b yanak, c/C kıyafet, p pantolon, w ayakkabı)
const BODY = {
  down: ['....hhhh....', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hhsssssshh.', '.hssssssssh.', '.hsessssesh.', '..ssssssss..', '..sbssssbs..', '...ssssss...', '..cccccccc..', '.sccccccccs.', '.sccccccccs.', '.sCccccccCs.', '..CCCCCCCC..', '..pppppppp..', '..ppp..ppp..', '..ppp..ppp..', '..www..www..'],
  down2: ['....hhhh....', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hhsssssshh.', '.hssssssssh.', '.hsessssesh.', '..ssssssss..', '..sbssssbs..', '...ssssss...', '..cccccccc..', '.sccccccccs.', '.sccccccccs.', '.sCccccccCs.', '..CCCCCCCC..', '..pppppppp..', '...pp..ppp..', '...pp..ppp..', '...ww..www..'],
  up: ['....hhhh....', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '..hhhhhhhh..', '..shhhhhhs..', '...ssssss...', '..cccccccc..', '.sccccccccs.', '.sccccccccs.', '.sCccccccCs.', '..CCCCCCCC..', '..pppppppp..', '..ppp..ppp..', '..ppp..ppp..', '..www..www..'],
  up2: ['....hhhh....', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '..hhhhhhhh..', '..shhhhhhs..', '...ssssss...', '..cccccccc..', '.sccccccccs.', '.sccccccccs.', '.sCccccccCs.', '..CCCCCCCC..', '..pppppppp..', '..ppp..pp...', '..ppp..pp...', '..www..ww...'],
  side: ['...hhhhh....', '..hhhhhhhh..', '.hhhhhhhhh..', '.hhhhhssss..', '.hhhhsssss..', '.hhhhssses..', '..hhhssssss.', '..hhsssbs...', '...sssss....', '...ccccc....', '..ccccccc...', '..ccsccccc..', '..ccsccccc..', '..CCCCCCC...', '...ppppp....', '...pp.pp....', '..pp...pp...', '..ww...ww...'],
  side2: ['...hhhhh....', '..hhhhhhhh..', '.hhhhhhhhh..', '.hhhhhssss..', '.hhhhsssss..', '.hhhhssses..', '..hhhssssss.', '..hhsssbs...', '...sssss....', '...ccccc....', '..ccccccc...', '..cccsccc...', '..cccsccc...', '..CCCCCCC...', '...ppppp....', '....ppp.....', '....pp......', '....ww......'],
  sit: ['....hhhh....', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hhsssssshh.', '.hssssssssh.', '.hsessssesh.', '..ssssssss..', '..sbssssbs..', '...ssssss...', '..cccccccc..', '.sccccccccs.', '.sccccccccs.', '.sCccccccCs.', '.pppppppppp.', '.pppppppppp.', '..ww....ww..', '............', '............'],
  sitBack: ['....hhhh....', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '..hhhhhhhh..', '..shhhhhhs..', '...ssssss...', '..cccccccc..', '.sccccccccs.', '.sccccccccs.', '.sCccccccCs.', '..CCCCCCCC..', '............', '............', '............', '............'],
};

function withHair(rows, style, key) {
  const back = key === 'up' || key === 'up2' || key === 'sitBack';
  let r = rows.slice();
  if (style === 'long') {
    // Omuzlara inen saç: yanlara şerit
    r = r.map((row, y) => (y >= 3 && y <= 12 && !key.startsWith('side') ? 'h' + row.slice(1, 11) + 'h' : row));
    if (key.startsWith('side')) r = r.map((row, y) => (y >= 6 && y <= 11 ? 'hh' + row.slice(2) : row));
    if (back) r = r.map((row, y) => (y >= 7 && y <= 11 ? '.' + 'h'.repeat(10) + '.' : row));
  }
  if (style === 'bun') r = ['.....hh.....', '....hhhh....', ...r];
  return r;
}

const cache = new Map();
/** Görünüme göre tüm yön/yürüme karelerini üretir (önbellekli). */
export function characterSprites(look) {
  look = { ...DEFAULT_LOOK, ...(look || {}) };
  const key = JSON.stringify(look);
  if (cache.has(key)) return cache.get(key);
  const shirt = SHIRT[look.shirt] ?? SHIRT[0];
  const pal = {
    h: HAIR[look.hairColor] ?? HAIR[0],
    s: SKIN[look.skin] ?? SKIN[0],
    e: '#2b1d16',
    b: '#ff9d8a',
    c: shirt,
    C: shade(shirt, -0.22),
    p: PANTS[look.pants] ?? PANTS[0],
    w: '#3a2a22',
  };
  const set = {};
  for (const [k, rows] of Object.entries(BODY)) set[k] = sprite(withHair(rows, look.hair, k), pal);
  set.sideL = mirror(set.side);
  set.side2L = mirror(set.side2);
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

// ---- Kedi (12×7) ----
const CAT = [
  ['.........k.k', '.........kkk', '.........kek', 'k.kkkkkkkkk.', '.kkkkkkkkkk.', '..kwkkkkkk..', '..k.k..k.k..'],
  ['.........k.k', '.........kkk', '.........kek', 'k.kkkkkkkkk.', '.kkkkkkkkkk.', '..kwkkkkkk..', '.k.k....k.k.'],
];
const CAT_SIT = ['..k.k...', '..kkk...', '..kek...', '.kkkkk..', 'kkkwkkk.', 'kkkwkkkk', '.kkkkk.k'];
export function catSprites(color = '#f0a050') {
  const pal = { k: color, e: '#2b1d16', w: '#fff1e2' };
  const right = CAT.map((r) => sprite(r, pal));
  return { right, left: right.map(mirror), sit: sprite(CAT_SIT, pal) };
}
