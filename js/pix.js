// Piksel sanat yardımcıları (şömine çizimlerinin dili): koyu dış hat, sol üstten ışık, her yüzeyde 3-4 ton,
// geçişlerde noktalama (dither), ahşap damarı. Yumuşak gradyan ve yarı saydam boya yok; her piksel bilinçli.
import { R, OUT, shade } from './art.js';

export { OUT };
export const P = (g, x, y, c) => R(g, x, y, 1, 1, c);

/** Bir rengin tonları: o dış hat, d2 en koyu, d gölge, m ana, l ışık, h parlama. */
export const ramp = (c) => ({ o: shade(c, -0.72), d2: shade(c, -0.4), d: shade(c, -0.2), m: c, l: shade(c, 0.2), h: shade(c, 0.45) });

/** Dama tahtası noktalama: iki ton arasında yumuşak geçiş yerine. */
export function dith(g, x, y, w, h, c, ph = 0) {
  for (let j = 0; j < h; j++) for (let i = (j + ph) & 1; i < w; i += 2) P(g, x + i, y + j, c);
}

/** Dış hatlı, köşeleri kırpık, kabartmalı kutu. Döndürür: kullanılan tonlar. */
export function block(g, x, y, w, h, c, { o = OUT, cut = 1, bevel = true } = {}) {
  const k = ramp(c);
  if (cut) { R(g, x + 1, y, w - 2, h, o); R(g, x, y + 1, w, h - 2, o); } else R(g, x, y, w, h, o);
  R(g, x + 1, y + 1, w - 2, h - 2, k.m);
  if (bevel && w > 3 && h > 3) {
    R(g, x + 1, y + 1, w - 2, 1, k.l); R(g, x + 1, y + 1, 1, h - 2, k.l);
    R(g, x + 1, y + h - 2, w - 2, 1, k.d); R(g, x + w - 2, y + 2, 1, h - 3, k.d);
    P(g, x + 1, y + 1, k.h);
  }
  return k;
}

/** İçe gömük panel (çekmece, kapı paneli): üst-sol gölgeli, alt-sağ ışıklı. */
export function inset(g, x, y, w, h, c) {
  const k = ramp(c);
  R(g, x, y, w, h, k.m);
  R(g, x, y, w, 1, k.d2); R(g, x, y, 1, h, k.d2);
  R(g, x + 1, y + h - 1, w - 1, 1, k.l); R(g, x + w - 1, y + 1, 1, h - 1, k.l);
  return k;
}

/** Tohumlu rastgele (her açılışta aynı desen). */
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Ahşap damarı: kısa kesik yatay çizgiler, arada tek tük budak. */
export function grain(g, x, y, w, h, c, seed = 7, step = 2) {
  const r = rng(seed);
  for (let j = 1; j < h - 1; j += step) {
    let i = (r() * 4) | 0;
    while (i < w - 1) {
      const len = 2 + ((r() * 7) | 0);
      if (r() < 0.6) R(g, x + i, y + j, Math.min(len, w - 1 - i), 1, c);
      i += len + 2 + ((r() * 4) | 0);
    }
  }
}

/** Zeminde nesnenin altına düşen gölge: koyu çekirdek + noktalı kenar. */
export function floorShadow(g, x, y, w, h, base) {
  const d = shade(base, -0.32), d2 = shade(base, -0.5);
  R(g, x + 1, y, w - 2, h, d);
  dith(g, x - 1, y, w + 2, h, d);
  R(g, x + 3, y, w - 6, Math.max(1, h - 1), d2);
}

/** Yaprak: (x,y) sap ucu, yön -1 sol / 1 sağ / 0 yukarı. */
export function leaf(g, x, y, len, dir, c) {
  const k = ramp(c);
  for (let i = 0; i < len; i++) {
    const t = i / len, wdt = Math.max(1, Math.round(Math.sin(t * Math.PI) * 3.4));
    const cx = x + Math.round(dir * i * 0.8), cy = y - Math.round(i * (Math.abs(dir) === 1 ? 0.7 : 1));
    R(g, cx - wdt - 1, cy, wdt * 2 + 3, 1, OUT);
    R(g, cx - wdt, cy, wdt * 2 + 1, 1, i < len * 0.5 ? k.d : k.m);
    if (wdt > 1) P(g, cx - wdt + 1, cy, k.l);
  }
  const tx = x + Math.round(dir * len * 0.8), ty = y - Math.round(len * (Math.abs(dir) === 1 ? 0.7 : 1));
  P(g, tx, ty, OUT);
}
