"""art.js'deki eski elle çizilmiş karakter kodunu, tasarımcı katmanlarını birleştiren koda çevirir."""
import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'js', 'art.js')
s = open(p, encoding='utf8').read()
a = s.index("export const HAIR_STYLES")
b = s.index("export function shade(")
s = s[:a] + r"""export const HAIR_STYLES = ['short', 'spiky', 'long', 'bob', 'bowl', 'round', 'none'];

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

""" + s[b:]
s = s.replace("// Piksel art yardımcıları ve karakter/evcil hayvan sprite'ları.", "// Piksel art yardımcıları ve karakter/evcil hayvan sprite'ları.\nimport { CHAR_DATA } from './char-data.js';", 1)
open(p, 'w', encoding='utf8').write(s)
print('ok')
