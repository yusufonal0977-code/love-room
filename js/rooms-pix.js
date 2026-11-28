// Şömine odası (şöminenin kendisi hariç), balkon, hobi köşesi, yatak odası ve mutfak: piksel sanat sürümü (deneme).
// Şömine ve raf süsleri tasarımcı çizimi (semine.js); burada dokunulmaz. Ölçüler ve etkileşim noktaları eskisiyle aynı.
import { R, shade } from './art.js';
import { P, OUT, ramp, dith, block, inset, grain, floorShadow, leaf, rng } from './pix.js';
import { wall, wainscot, floor, curtain, sideDoor } from './salon-pix.js';

const W = 192, H = 144;
const WOOD = '#a8683c', WOOD_L = '#c98a55', WOOD_D = '#7a4426', GOLD = '#ffc93c', METAL = '#3a3330';

/** Pencere çerçevesi: (x,y,w,h) dış ölçü; cam rengi; gökyüzü dyn'de çizilir. */
function windowBox(g, x, y, w, h, glass = '#5ec2ff') {
  block(g, x, y, w, h, WOOD_D, { cut: 0 });
  R(g, x + 2, y + 2, w - 4, h - 4, glass);
}
function windowBars(g, x, y, w, h) { // kayıtlar ve cam parlaması (gökyüzünün üstüne)
  const mx = x + ((w / 2) | 0) - 1, my = y + ((h / 2) | 0) - 1;
  R(g, mx, y, 2, h, OUT); R(g, x, my, w, 2, OUT);
  P(g, x + 2, y + 2, '#ffffff'); P(g, x + 3, y + 3, '#ffffff'); P(g, x + 2, y + 4, '#e8f6ff'); P(g, mx + 4, y + 2, '#ffffff');
}
function books(g, x, y, n, h, seed) { // rafta kitap sırası: dış hatlı sırtlar, farklı boylar, biri yatık
  const cols = ['#ff7a59', '#ffc93c', '#5b8def', '#4fbf6a', '#ff5d8f', '#fff3dc', '#8a6fb0'], r = rng(seed);
  let bx = x;
  for (let i = 0; i < n; i++) {
    const c = ramp(cols[(r() * cols.length) | 0]), bh = h - ((r() * 3) | 0), bw = 3;
    R(g, bx, y + h - bh, bw, bh, OUT); R(g, bx + 1, y + h - bh + 1, bw - 2 + 1, bh - 1, c.m); P(g, bx + 1, y + h - bh + 1, c.h);
    R(g, bx + 1, y + h - bh + 3, 1, 1, c.d); // sırt bandı
    bx += bw;
  }
  return bx;
}

// ===================== Şömine odası =====================
export function drawSomine(g, col, wallpaper, fireplace) {
  wall(g, col, wallpaper);
  wainscot(g, shade(col.wall, -0.25), '#e0b25a');
  floor(g, col.floor);
  // İlişki saati: altın kasa, sarkaç kutusu (kollar dyn'de)
  R(g, 126, 13, 14, 18, OUT); R(g, 125, 14, 16, 16, OUT);
  const gk = ramp('#e0b25a');
  R(g, 127, 14, 12, 16, gk.m); R(g, 126, 15, 14, 14, gk.m); R(g, 127, 15, 10, 1, gk.h); R(g, 126, 16, 1, 10, gk.l); R(g, 139, 16, 1, 12, gk.d);
  R(g, 130, 30, 6, 7, OUT); R(g, 131, 30, 4, 6, gk.d); R(g, 131, 30, 1, 6, gk.m);
  // Kitaplık
  floorShadow(g, 2, 64, 30, 2, col.floor);
  R(g, 1, 17, 32, 48, OUT);
  const wk = ramp(WOOD_D);
  R(g, 2, 18, 30, 46, wk.m); R(g, 2, 18, 30, 1, wk.l); R(g, 2, 18, 1, 46, wk.l); R(g, 31, 18, 1, 46, wk.d2);
  R(g, 4, 20, 26, 42, '#2a1a10'); dith(g, 4, 20, 26, 2, '#1a100a');
  for (let s = 0; s < 3; s++) {
    const sy = 21 + s * 14;
    books(g, 5, sy, s === 2 ? 2 : 7, 11, 11 + s * 5);
    if (s !== 2) { R(g, 26, sy + 3, 3, 8, OUT); R(g, 26, sy + 4, 2, 7, '#c4566c'); } // yatık kitap ucu
    R(g, 4, sy + 11, 26, 3, OUT); R(g, 4, sy + 11, 26, 1, ramp(WOOD).l); R(g, 4, sy + 12, 26, 1, WOOD); // raf tahtası
  }
  // Günlük (pembe, altın toka)
  R(g, 11, 46, 8, 11, OUT); const dk = ramp('#ff5d8f'); R(g, 12, 47, 6, 9, dk.m); R(g, 12, 47, 6, 1, dk.h); R(g, 17, 48, 1, 8, dk.d);
  R(g, 14, 50, 2, 2, GOLD); P(g, 14, 50, '#fff1a8');
  books(g, 20, 49, 3, 7, 3);
  // Şömine: tasarımcı çizimi (dokunulmaz)
  fireplace();
  // Koyun postu: kabarık kenar
  const wool = ramp('#fffaf0');
  R(g, 73, 77, 46, 14, OUT); R(g, 71, 79, 50, 10, OUT);
  R(g, 74, 78, 44, 12, wool.m); R(g, 72, 80, 48, 8, wool.m);
  for (let x = 74; x < 118; x += 3) { P(g, x, 77, OUT); P(g, x + 1, 90, OUT); } // tüy uçları
  dith(g, 74, 86, 44, 3, wool.d); R(g, 76, 79, 40, 1, wool.l);
  for (let i = 0; i < 9; i++) P(g, 78 + i * 5, 82 + (i % 2) * 2, wool.d); // kıvırcık doku
  // Odun sepeti: hasır örgü + kütük uçları
  floorShadow(g, 54, 68, 14, 2, col.floor);
  for (const [lx, ly, lh] of [[55, 53, 6], [59, 52, 7], [63, 53, 6]]) {
    R(g, lx - 1, ly - 1, 5, lh + 1, OUT); R(g, lx, ly, 3, lh, '#8a5a36'); P(g, lx + 1, ly, '#e0b080'); P(g, lx + 1, ly + 1, '#c8742c');
  }
  R(g, 53, 57, 16, 12, OUT);
  const bk = ramp('#c9a36b');
  R(g, 54, 58, 14, 10, bk.m);
  for (let y = 58; y < 68; y += 2) for (let x = 54 + (y % 4 ? 0 : 2); x < 68; x += 4) R(g, x, y, 2, 1, bk.d);
  R(g, 54, 58, 14, 1, bk.l);
  sideDoor(g, 'right'); sideDoor(g, 'left');
}
export function drawSomineClock(g, hour, t) {
  const a = ((hour % 12) / 12) * Math.PI * 2, m = (hour % 1) * Math.PI * 2;
  R(g, 129, 17, 8, 10, '#fff3dc'); R(g, 128, 18, 10, 8, '#fff3dc'); // yuvarlatılmış kadran
  for (const [dx, dy] of [[4, 0], [4, 9], [0, 4], [9, 4]]) P(g, 128 + dx + (dx === 9 ? 0 : 0), 17 + dy, '#8a6a4a');
  P(g, 133, 17, '#e0473f');
  const ln = (x1, y1, c) => { const n = 5; for (let i = 0; i <= n; i++) P(g, Math.round(133 + (x1 - 133) * i / n), Math.round(22 + (y1 - 22) * i / n), c); };
  ln(133 + Math.sin(m) * 4, 22 - Math.cos(m) * 4, '#3a2418');
  ln(133 + Math.sin(a) * 2.5, 22 - Math.cos(a) * 2.5, '#e0473f');
  P(g, 133, 22, OUT);
  const sx = 132 + Math.round(Math.sin(t * 2) * 1.5); // sarkaç
  R(g, sx, 31, 1, 3, '#b8861c'); R(g, sx - 1, 34, 3, 2, OUT); P(g, sx, 34, '#ff5d8f');
}
export function armchair(g) {
  floorShadow(g, 148, 88, 30, 2, '#8a4f2c');
  const y = ramp('#ffc93c');
  // Sırt
  R(g, 149, 59, 28, 16, OUT); R(g, 150, 60, 26, 14, y.d); R(g, 151, 60, 24, 12, y.m); R(g, 151, 60, 24, 2, y.l); P(g, 151, 60, y.h);
  for (let x = 155; x < 174; x += 6) { P(g, x, 66, y.d2); P(g, x, 65, y.l); } // kapitone
  // Kolçaklar
  for (const ax of [147, 171]) { R(g, ax, 69, 8, 18, OUT); R(g, ax + 1, 70, 6, 16, y.d); R(g, ax + 1, 70, 6, 2, y.l); P(g, ax + 1, 70, y.h); dith(g, ax + 1, 80, 6, 6, y.d2); }
  // Oturak
  R(g, 154, 73, 18, 10, OUT); R(g, 155, 74, 16, 8, y.m); R(g, 155, 74, 16, 1, y.h); dith(g, 155, 79, 16, 3, y.d);
  R(g, 152, 82, 22, 5, OUT); R(g, 153, 82, 20, 4, y.d); R(g, 153, 82, 20, 1, y.m);
  // Krem yastık
  const c = ramp('#fff3dc');
  R(g, 165, 61, 10, 19, OUT); R(g, 166, 62, 8, 17, c.m); R(g, 166, 62, 8, 1, c.h); R(g, 173, 63, 1, 15, c.d); R(g, 168, 64, 1, 13, c.d);
  // Ayaklar
  for (const lx of [149, 173]) { R(g, lx, 86, 4, 3, OUT); P(g, lx + 1, 86, WOOD); P(g, lx + 2, 86, WOOD_D); }
}

// ===================== Balkon =====================
function flowerBox(g, x, colors) {
  R(g, x - 1, 51, 30, 8, OUT); const k = ramp('#b8552f');
  R(g, x, 52, 28, 6, k.m); R(g, x, 52, 28, 1, k.l); dith(g, x, 56, 28, 2, k.d);
  for (let i = 0; i < 6; i++) {
    const fx = x + 2 + i * 4, fy = 46 - (i % 2) * 2, c = ramp(colors[i % 3]);
    R(g, fx + 1, fy + 3, 1, 52 - fy - 3, '#2e8a4e'); P(g, fx, fy + 5, '#4fbf6a');
    R(g, fx - 1, fy - 1, 5, 5, OUT); R(g, fx, fy, 3, 3, c.m); P(g, fx, fy, c.h); P(g, fx + 1, fy + 1, '#ffd27a');
  }
}
export function railing(g) {
  const k = ramp('#fff3dc');
  R(g, 0, 57, W, 5, OUT); R(g, 0, 58, W, 1, k.h); R(g, 0, 59, W, 2, k.m); // tırabzan
  for (let x = 2; x < W; x += 8) { R(g, x - 1, 61, 4, 9, OUT); R(g, x, 61, 2, 9, k.m); P(g, x, 61, k.l); P(g, x + 1, 68, k.d); }
  R(g, 0, 68, W, 2, OUT); R(g, 0, 68, W, 1, k.d);
  flowerBox(g, 20, ['#ff5d8f', '#ffc93c', '#fff3dc']); flowerBox(g, 144, ['#5b8def', '#ff7a59', '#fff3dc']);
}
function tileFloor(g, y0, c1, c2) {
  const a = ramp(c1), b = ramp(c2);
  for (let y = y0, r = 0; y < H; y += 8, r++) for (let x = (r % 2) * 8 - 8; x < W; x += 8) {
    const k = ((x / 8 + r) & 1) ? a : b;
    R(g, x, y, 8, 8, k.m); R(g, x, y, 8, 1, k.l); R(g, x, y, 1, 8, k.l); R(g, x + 7, y + 1, 1, 7, k.d); R(g, x + 1, y + 7, 7, 1, k.d);
  }
  dith(g, 0, y0, W, 2, shade(c1, -0.35));
}
export function drawBalkon(g, col) {
  tileFloor(g, 66, col.floor, col.accent);
  railing(g);
  // Bank (karşıya bakan): sırt çıtaları, oturak, minderler
  floorShadow(g, 66, 93, 60, 2, col.floor);
  const w = ramp(WOOD), wl = ramp(WOOD_L);
  for (const sy of [70, 75]) { R(g, 67, sy - 1, 58, 6, OUT); R(g, 68, sy, 56, 4, w.m); R(g, 68, sy, 56, 1, w.l); grain(g, 68, sy, 56, 4, w.d, sy, 2); }
  R(g, 69, 69, 3, 12, OUT); R(g, 120, 69, 3, 12, OUT);
  R(g, 65, 79, 62, 10, OUT); R(g, 66, 80, 60, 8, wl.m); R(g, 66, 80, 60, 1, wl.h); R(g, 66, 86, 60, 2, wl.d); grain(g, 66, 81, 60, 5, wl.d, 4, 2);
  for (const lx of [68, 121]) { R(g, lx - 1, 88, 5, 7, OUT); R(g, lx, 88, 3, 6, '#5a3a22'); P(g, lx, 88, '#7a4a2a'); }
  for (const [mx, mc] of [[76, '#ff7a59'], [106, '#3fb7a4']]) { // minderler
    const k = ramp(mc); R(g, mx - 1, 75, 12, 10, OUT); R(g, mx, 76, 10, 8, k.m); R(g, mx, 76, 10, 1, k.h); dith(g, mx, 81, 10, 3, k.d); P(g, mx + 5, 79, k.d2);
  }
  // Sol cam kapı
  R(g, 0, 71, 6, 46, OUT); R(g, 0, 72, 5, 44, '#fff3dc'); R(g, 0, 74, 3, 40, '#9ad0ff'); P(g, 1, 76, '#ffffff'); P(g, 1, 77, '#ffffff'); R(g, 0, 95, 3, 1, '#fff3dc');
  R(g, 5, 91, 13, 12, OUT); R(g, 6, 92, 11, 10, '#b48a54'); R(g, 6, 92, 11, 1, '#d8b47c');
}
export function drawCity(g, night) {
  const blds = [[0, 30, 18], [16, 24, 14], [30, 34, 20], [52, 20, 12], [64, 28, 18], [84, 18, 14], [100, 26, 20], [122, 22, 12], [134, 32, 18], [154, 24, 16], [172, 30, 20]];
  const base = night ? '#23264a' : '#7aa0c8', k = ramp(base);
  for (const [x, y, w] of blds) {
    R(g, x, y + 3, w, 58 - y - 3, shade(base, -0.25)); // dış hat yerine koyu kenar (uzak bina)
    R(g, x + 1, y + 4, w - 2, 58 - y - 4, k.m); R(g, x + 1, y + 4, 1, 58 - y - 4, k.l); R(g, x + 1, y + 4, w - 2, 1, k.l);
    if (w > 15) { R(g, x + 3, y + 1, 3, 3, shade(base, -0.25)); } // çatı çıkıntısı
    for (let wy = y + 8; wy < 54; wy += 6) for (let wx = x + 3; wx < x + w - 2; wx += 5) {
      if (night) { if ((wx * 7 + wy) % 3) { R(g, wx, wy, 2, 2, '#ffd27a'); P(g, wx, wy, '#fff1c8'); } else R(g, wx, wy, 2, 2, k.d); }
      else { R(g, wx, wy, 2, 2, k.d); P(g, wx, wy, k.h); }
    }
  }
}
export function lightChain(g, on, t) {
  let px = 0, py = 10;
  for (let i = 0; i < 16; i++) {
    const x = 6 + i * 12, y = 8 + Math.round(Math.sin((i / 15) * Math.PI * 2) * 2) + 2;
    for (let s = 1; s < 12; s++) P(g, px + s, Math.round(py + (y - 2 - py) * s / 12 + Math.sin(s / 12 * Math.PI) * 2), METAL); // sarkan kablo
    px = x; py = y - 2;
    R(g, x, y - 2, 1, 2, METAL);
    const lit = on && (Math.sin(t * 2 + i) + 1) / 2 > 0.2, c = on ? (lit ? '#ffd27a' : '#ffb347') : '#8a7a60';
    R(g, x - 1, y - 1, 3, 5, OUT); R(g, x - 2, y, 5, 3, OUT); R(g, x - 1, y, 3, 3, c); if (on) P(g, x - 1, y, '#fff6c8');
  }
}
export function candleTable(g) {
  floorShadow(g, 140, 111, 18, 2, '#e88a5c');
  R(g, 139, 97, 20, 5, OUT); R(g, 140, 98, 18, 1, '#ffffff'); R(g, 140, 99, 18, 2, '#e8dcc4');
  R(g, 147, 101, 4, 10, OUT); R(g, 148, 101, 2, 10, '#4a4340'); R(g, 143, 109, 12, 4, OUT); R(g, 144, 110, 10, 2, '#4a4340');
  R(g, 145, 93, 5, 6, OUT); R(g, 146, 94, 3, 4, '#fff3dc'); P(g, 146, 94, '#ffffff');
  P(g, 147, 92, '#ffd27a'); P(g, 147, 91, '#fff1a8'); P(g, 147, 93, '#ff9a3a');
}
export function foosball(g) {
  floorShadow(g, 14, 131, 44, 2, '#e88a5c');
  R(g, 13, 111, 46, 18, OUT); const w = ramp(WOOD_D);
  R(g, 14, 112, 44, 16, w.m); R(g, 14, 112, 44, 1, w.l); R(g, 14, 126, 44, 2, w.d2);
  R(g, 16, 114, 40, 11, '#2e8a4e'); const gk = ramp('#3fae5a'); R(g, 17, 114, 38, 10, gk.m); dith(g, 17, 115, 38, 9, gk.l, 1);
  R(g, 35, 114, 1, 11, '#d8f5d8'); R(g, 16, 117, 2, 5, '#fff3dc'); R(g, 54, 117, 2, 5, '#fff3dc');
  [22, 30, 42, 50].forEach((x, i) => {
    R(g, x, 110, 1, 20, '#c8ccd4'); P(g, x, 110, '#ffffff'); R(g, x - 1, 108, 3, 2, OUT); // çubuk ve tutamak
    const c = ramp(i < 2 ? '#e0473f' : '#5b8def'), fy = 116 + (i % 2) * 3;
    R(g, x - 2, fy - 1, 5, 5, OUT); R(g, x - 1, fy, 3, 3, c.m); P(g, x - 1, fy, c.h);
  });
  R(g, 34, 119, 3, 3, OUT); P(g, 35, 120, '#ffffff');
  for (const lx of [16, 53]) { R(g, lx - 1, 128, 5, 5, OUT); R(g, lx, 128, 3, 4, w.d); }
}
export function poolTable(g, x, y) {
  floorShadow(g, x, y + 24, 50, 2, '#e88a5c');
  R(g, x - 1, y + 1, 52, 21, OUT); const w = ramp('#6b3e22');
  R(g, x, y + 2, 50, 18, w.m); R(g, x, y + 2, 50, 1, w.l); R(g, x, y + 19, 50, 1, w.d2);
  R(g, x + 2, y + 4, 46, 14, '#1f6a40'); const f = ramp('#3fa86a'); R(g, x + 3, y + 5, 44, 12, f.m); dith(g, x + 3, y + 5, 44, 2, f.d);
  for (const [px, py] of [[2, 4], [24, 4], [46, 4], [2, 16], [24, 16], [46, 16]]) R(g, x + px, y + py, 2, 2, '#0d0907');
  for (const [bx, by, c] of [[10, 10, '#ffffff'], [34, 8, '#ffc93c'], [36, 11, '#e0473f'], [34, 13, '#5b8def']]) { R(g, x + bx, y + by, 2, 2, c); P(g, x + bx, y + by, '#ffffff'); P(g, x + bx + 1, y + by + 1, shade(c, -0.35)); }
  R(g, x + 6, y - 1, 32, 3, OUT); R(g, x + 7, y, 22, 1, '#e0b25a'); R(g, x + 29, y, 8, 1, '#7a4426'); // isteka
  for (const lx of [x + 2, x + 45]) { R(g, lx - 1, y + 20, 5, 5, OUT); R(g, lx, y + 20, 3, 4, WOOD_D); }
}
/** Bizim çiçeğimiz: 0 tohum, 1 filiz, 2 tomurcuk, 3 çiçek; uzun süre sulanmazsa boyun büker. */
export function flower(g, x, y, t, { stage, wilt }) {
  floorShadow(g, x - 7, y, 14, 1, '#e88a5c');
  const pot = ramp('#ff7a59');
  R(g, x - 8, y - 12, 16, 13, OUT);
  R(g, x - 7, y - 10, 14, 10, pot.m); R(g, x - 7, y - 10, 2, 10, pot.l); R(g, x + 4, y - 10, 3, 10, pot.d); R(g, x - 7, y - 2, 14, 2, pot.d2);
  for (const [hx, hy] of [[-3, -6], [2, -5]]) { R(g, x + hx, y + hy, 2, 1, '#ffd27a'); P(g, x + hx, y + hy + 1, '#ffb347'); P(g, x + hx + 1, y + hy + 1, '#ffd27a'); } // kalpler
  R(g, x - 6, y - 11, 12, 1, '#4a2a16'); R(g, x - 6, y - 11, 12, 1, '#6b3e22'); dith(g, x - 6, y - 11, 12, 1, '#4a2a16');
  const sway = Math.round(Math.sin(t * 1.5) * (wilt ? 0 : 1));
  if (stage === 0) { R(g, x - 2, y - 13, 4, 2, OUT); R(g, x - 1, y - 12, 2, 1, '#8a5a36'); return; }
  const top = y - 11 - [0, 8, 14, 20][stage];
  R(g, x - 1, top, 3, y - 11 - top, OUT); R(g, x, top, 1, y - 11 - top, '#3fae5a');
  leaf(g, x - 1, top + 9, 5, -1, '#4fbf6a'); leaf(g, x + 1, top + 11, 5, 1, '#4fbf6a');
  const hx = x + sway + (wilt ? 3 : 0), hy = top + (wilt ? 3 : 0);
  if (stage === 1) { R(g, hx - 2, hy - 3, 5, 4, OUT); R(g, hx - 1, hy - 2, 3, 2, '#6fd07f'); P(g, hx - 1, hy - 2, '#a8f0b0'); }
  if (stage === 2) { const k = ramp('#ff7aa3'); R(g, hx - 3, hy - 6, 7, 7, OUT); R(g, hx - 2, hy - 5, 5, 5, k.m); P(g, hx - 1, hy - 5, k.h); R(g, hx - 2, hy - 1, 5, 1, '#4fbf6a'); }
  if (stage === 3) {
    const k = ramp(wilt ? '#b88aa0' : '#ff5d8f');
    for (const [dx, dy] of [[-4, -4], [2, -4], [-4, 1], [2, 1], [-1, -6], [-1, 2]]) R(g, hx + dx - 1, hy + dy - 1, 5, 5, OUT);
    for (const [dx, dy] of [[-4, -4], [2, -4], [-4, 1], [2, 1], [-1, -6], [-1, 2]]) { R(g, hx + dx, hy + dy, 3, 3, k.m); P(g, hx + dx, hy + dy, k.h); P(g, hx + dx + 2, hy + dy + 2, k.d); }
    R(g, hx - 1, hy - 2, 3, 3, '#ffd27a'); P(g, hx - 1, hy - 2, '#fff1a8'); P(g, hx + 1, hy, '#e0a020');
  }
}

// ===================== Hobi köşesi =====================
export function drawHobi(g, col, wallpaper) {
  wall(g, col, wallpaper);
  wainscot(g, '#ffd75e', '#e0a92a');
  floor(g, col.floor);
  // Bayrak süsü: sarkan ip + üçgen bayraklar
  for (let x = 48; x < 148; x++) P(g, x, 6 + Math.round(Math.sin(((x - 48) / 100) * Math.PI) * 3), METAL);
  for (let i = 0; i < 12; i++) {
    const x = 50 + i * 8, y = 7 + Math.round(Math.sin(((x + 3 - 48) / 100) * Math.PI) * 3), k = ramp(['#ff7a59', '#ffc93c', '#5b8def', '#ff5d8f'][i % 4]);
    for (let j = 0; j < 5; j++) { R(g, x + j - 1, y + j, 8 - j * 2 + 1, 1, OUT); R(g, x + j, y + j, 6 - j * 2, 1, j ? k.m : k.l); }
  }
  // Gardırop
  floorShadow(g, 6, 64, 34, 2, col.floor);
  R(g, 5, 11, 36, 54, OUT); const wd = ramp(WOOD_D), wl = ramp(WOOD_L);
  R(g, 6, 12, 34, 52, wd.m); R(g, 6, 12, 34, 2, wd.l);
  for (const [dx, dw] of [[8, 15], [24, 14]]) {
    R(g, dx, 14, dw, 48, wl.m); R(g, dx, 14, dw, 1, wl.h); R(g, dx, 14, 1, 48, wl.l); R(g, dx + dw - 1, 14, 1, 48, wl.d); grain(g, dx + 1, 15, dw - 2, 46, wl.d, dx, 3);
    for (const [py, ph] of [[18, 18], [42, 16]]) inset(g, dx + 2, py, dw - 4, ph, '#b47744');
  }
  R(g, 23, 14, 1, 48, OUT);
  for (const kx of [20, 25]) { R(g, kx, 33, 3, 8, OUT); R(g, kx + 1, 34, 1, 6, GOLD); }
  R(g, 4, 10, 38, 3, OUT); R(g, 5, 10, 36, 1, wd.l); // taç
  // Şövale (tuval dyn'de)
  for (const [lx, ly1, ly2] of [[62, 26, 64], [76, 26, 64]]) { R(g, lx - 1, ly1, 4, ly2 - ly1, OUT); R(g, lx, ly1, 2, ly2 - ly1, '#7a4426'); P(g, lx, ly1 + 1, '#a8683c'); }
  R(g, 68, 22, 4, 42, OUT); R(g, 69, 23, 2, 40, '#6a3a20');
  R(g, 57, 29, 26, 22, OUT); R(g, 58, 30, 24, 20, '#fffaf0'); R(g, 60, 32, 20, 16, '#ffffff');
  R(g, 57, 50, 26, 3, OUT); R(g, 58, 50, 24, 1, '#a8683c');
  // Palet
  R(g, 83, 54, 8, 7, OUT); R(g, 84, 55, 6, 5, '#e8d4b0'); P(g, 85, 56, '#ff5d8f'); P(g, 87, 56, '#5b8def'); P(g, 88, 57, '#ffc93c'); P(g, 86, 58, '#4fbf6a'); P(g, 89, 59, OUT);
  // Çalışma masası
  floorShadow(g, 92, 62, 40, 2, col.floor);
  R(g, 91, 43, 42, 6, OUT); R(g, 92, 44, 40, 1, wl.h); R(g, 92, 45, 40, 3, WOOD); grain(g, 92, 45, 40, 3, wl.d, 2, 1);
  for (const lx of [94, 128]) { R(g, lx - 1, 48, 4, 15, OUT); R(g, lx, 48, 2, 14, WOOD_D); }
  // Ekran
  R(g, 97, 37, 12, 8, OUT); R(g, 98, 38, 10, 5, '#2e2e3a'); R(g, 99, 39, 8, 3, '#5ec2ff'); P(g, 99, 39, '#bfe8ff'); R(g, 101, 43, 4, 2, OUT);
  // Defter, saksı
  R(g, 111, 40, 8, 5, OUT); R(g, 112, 41, 6, 3, '#fff3dc'); R(g, 112, 42, 6, 1, '#d8c8a8');
  R(g, 119, 35, 8, 10, OUT); R(g, 120, 36, 6, 8, '#e0794a'); P(g, 120, 36, '#f39a6a'); R(g, 124, 37, 2, 7, '#b8552f');
  leaf(g, 121, 35, 6, -1, '#3fae5a'); leaf(g, 124, 35, 6, 1, '#4fbf6a'); leaf(g, 122, 35, 7, 0, '#2e8a4e');
  // Fotoğraf kabini
  R(g, 141, 5, 46, 62, OUT); const rd = ramp('#e0473f');
  R(g, 142, 6, 44, 60, rd.m); R(g, 142, 6, 44, 1, rd.h); R(g, 142, 6, 1, 60, rd.l); R(g, 185, 7, 1, 59, rd.d2);
  R(g, 149, 3, 30, 8, OUT); R(g, 150, 4, 28, 6, '#fff3dc'); for (let x = 152; x < 177; x += 5) P(g, x, 6, '#e0473f'); // tabela
  R(g, 143, 10, 42, 5, OUT); for (let x = 144; x < 184; x += 3) { P(g, x, 12, (x % 2) ? '#fff1a8' : '#ffc93c'); } // ampuller
  R(g, 145, 15, 20, 50, OUT); const cr = ramp('#c43838');
  for (let i = 0; i < 18; i++) R(g, 146 + i, 16, 1, 48, [cr.l, cr.m, cr.d, cr.m][i % 4]); // perde kıvrımları
  for (let i = 0; i < 18; i += 2) P(g, 146 + i, 63, cr.d2);
  R(g, 166, 16, 16, 48, '#2a1a18'); dith(g, 166, 16, 16, 6, '#1a100c');
  R(g, 169, 23, 10, 12, OUT); R(g, 170, 24, 8, 10, '#ffffff'); R(g, 171, 25, 6, 8, '#ffd27a'); P(g, 171, 25, '#fff1c8'); // örnek foto şeridi
  R(g, 167, 50, 14, 3, OUT); R(g, 168, 51, 12, 1, '#7a4426'); // tabure
  // Yuvarlak halı
  const pk = ramp('#ff5d8f'), yl = ramp('#ffc93c'), or = ramp('#ff7a59');
  R(g, 67, 91, 58, 28, OUT); R(g, 63, 95, 66, 20, OUT);
  R(g, 68, 92, 56, 26, pk.m); R(g, 64, 96, 64, 18, pk.m); dith(g, 66, 112, 60, 3, pk.d);
  R(g, 72, 96, 48, 18, yl.m); R(g, 70, 98, 52, 14, yl.m); dith(g, 70, 98, 52, 1, yl.l);
  R(g, 78, 100, 36, 10, or.m); R(g, 76, 102, 40, 6, or.m); dith(g, 78, 107, 36, 2, or.d);
  // Alt kapı (salona) ve paspas
  R(g, 79, 137, 34, 7, OUT); R(g, 80, 140, 32, 4, WOOD_D); R(g, 82, 138, 28, 2, '#c9a36b'); dith(g, 82, 138, 28, 2, '#a8864e');
  sideDoor(g, 'right');
}
export function drawHobiDyn(g, st, drawing) {
  const k = ramp(st.desk ? '#ffe08a' : '#d6c08f'); // masa lambası
  R(g, 107, 34, 4, 11, OUT); R(g, 108, 34, 2, 10, '#7d746c');
  R(g, 104, 29, 10, 6, OUT); R(g, 105, 30, 8, 4, k.m); R(g, 105, 30, 8, 1, k.l); P(g, 112, 33, k.d);
  if (st.desk) dith(g, 105, 34, 8, 1, '#fff6c8');
  if (drawing) R(g, 60, 32, 20, 16, '#fffaf0');
  else { // tuvaldeki kalp
    const c = ramp('#ff5d8f');
    R(g, 65, 35, 4, 4, OUT); R(g, 70, 35, 4, 4, OUT); R(g, 64, 37, 11, 4, OUT); R(g, 66, 41, 7, 2, OUT); R(g, 68, 43, 3, 2, OUT);
    R(g, 66, 36, 2, 2, c.m); R(g, 71, 36, 2, 2, c.m); R(g, 65, 38, 9, 2, c.m); R(g, 67, 40, 5, 2, c.m); R(g, 69, 42, 1, 2, c.m); P(g, 66, 36, c.h);
  }
}
export function gameTable(g) {
  floorShadow(g, 84, 109, 24, 2, '#e0b07a');
  R(g, 83, 97, 26, 8, OUT); R(g, 84, 98, 24, 1, ramp(WOOD_L).h); R(g, 84, 99, 24, 5, WOOD);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) R(g, 88 + i * 3, 99 + j * 2, 2, 2, (i + j) % 2 ? '#fff3dc' : '#3a2418');
  for (const lx of [86, 104]) { R(g, lx - 1, 104, 4, 7, OUT); R(g, lx, 104, 2, 6, WOOD_D); }
  for (const [px, c] of [[90, '#e0473f'], [100, '#5b8def']]) { const k = ramp(c); R(g, px - 1, 94, 5, 5, OUT); R(g, px, 95, 3, 3, k.m); P(g, px, 95, k.h); }
}

// ===================== Yatak odası =====================
function nightstand(g, x, floorCol) {
  floorShadow(g, x, 64, 20, 2, floorCol);
  R(g, x - 1, 49, 22, 16, OUT); const w = ramp(WOOD);
  R(g, x, 50, 20, 2, ramp(WOOD_L).h); R(g, x, 52, 20, 12, w.d);
  for (const dy of [54, 59]) { inset(g, x + 2, dy, 16, 4, WOOD); R(g, x + 9, dy + 1, 2, 1, GOLD); }
  for (const lx of [x + 1, x + 16]) R(g, lx, 64, 3, 2, OUT);
  R(g, x + 8, 44, 4, 6, OUT); R(g, x + 9, 44, 2, 6, '#7d746c'); R(g, x + 5, 48, 10, 2, OUT); R(g, x + 6, 48, 8, 1, '#7d746c'); // lamba ayağı
}
export function drawYatak(g, col, wallpaper) {
  wall(g, col, wallpaper);
  wainscot(g, shade(col.wall, -0.2), '#c9a36b');
  floor(g, col.floor);
  windowBox(g, 150, 8, 28, 26, '#141a3d');
  curtain(g, 145, '#e9d8f0', '#b39ddb'); curtain(g, 176, '#e9d8f0', '#b39ddb');
  R(g, 143, 2, 41, 4, OUT); R(g, 144, 3, 39, 1, '#7d746c');
  // Yatak başlığı: kapitone kadife
  R(g, 61, 25, 70, 30, OUT); const hb = ramp('#6b4a8a'), wd = ramp(WOOD_D);
  R(g, 62, 26, 68, 28, wd.m); R(g, 62, 26, 68, 1, wd.l);
  R(g, 64, 28, 64, 24, hb.m); R(g, 64, 28, 64, 2, hb.l); dith(g, 64, 48, 64, 4, hb.d);
  for (let y = 32; y < 48; y += 6) for (let x = 70 + ((y / 6) % 2) * 4; x < 126; x += 8) { P(g, x, y, hb.d2); P(g, x, y - 1, hb.h); }
  // Yatak gövdesi ve çarşaf
  R(g, 61, 50, 70, 56, OUT); R(g, 62, 50, 68, 54, wd.m);
  const sh = ramp('#f4efe6'); R(g, 64, 50, 64, 52, sh.m); R(g, 64, 50, 64, 1, sh.h); R(g, 127, 51, 1, 51, sh.d);
  for (const px of [68, 100]) { // yastıklar
    R(g, px - 1, 51, 26, 13, OUT); R(g, px, 52, 24, 11, '#ffffff'); R(g, px, 52, 24, 1, '#ffffff'); R(g, px, 61, 24, 2, '#e3dccf');
    dith(g, px + 1, 58, 22, 3, '#ece6dc'); P(g, px + 12, 56, '#e3dccf'); R(g, px + 10, 55, 5, 1, '#ece6dc');
  }
  nightstand(g, 40, col.floor); nightstand(g, 132, col.floor);
  // Kilim (yatağın ayak ucu)
  R(g, 57, 111, 78, 20, OUT); R(g, 58, 112, 76, 18, '#e9d8f0');
  const lv = ramp('#8a6fb0'); R(g, 60, 114, 72, 14, lv.m); R(g, 64, 117, 64, 8, '#b39ddb'); dith(g, 64, 117, 64, 1, lv.l);
  for (let x = 68; x < 126; x += 8) { P(g, x, 120, '#e9d8f0'); P(g, x + 1, 121, '#e9d8f0'); P(g, x, 122, '#e9d8f0'); P(g, x - 1, 121, '#e9d8f0'); }
  sideDoor(g, 'right');
}
export function drawYatakDyn(g, st, hour, t, sky) {
  sky(g, 152, 10, 24, 22, hour, t); windowBars(g, 152, 10, 24, 22);
  for (const x of [40, 132]) {
    const k = ramp(st.bedlamp ? '#ffcf8a' : '#b8a48a');
    for (let j = 0; j < 7; j++) { const hw = 4 + Math.round(j * 0.4); R(g, x + 10 - hw - 1, 38 + j, hw * 2 + 2, 1, OUT); R(g, x + 10 - hw, 38 + j, hw * 2, 1, j < 1 ? k.h : k.m); P(g, x + 10 + hw - 1, 38 + j, k.d); }
    if (st.bedlamp) dith(g, x + 6, 44, 8, 1, '#fff1c8');
  }
}
export function blanket(g) { // yorgan: uzananların gövdesini örter
  const q = ramp('#c4566c'), sh = ramp('#f4efe6');
  R(g, 63, 65, 66, 38, OUT);
  R(g, 64, 66, 64, 36, q.m); R(g, 64, 66, 64, 4, sh.m); R(g, 64, 66, 64, 1, sh.h); R(g, 64, 70, 64, 1, q.d2); // kıvrılmış çarşaf
  for (let x = 70; x < 126; x += 12) for (let y = 76; y < 100; y += 10) { R(g, x, y, 3, 3, q.l); P(g, x, y, q.h); } // desen
  for (let y = 73; y < 102; y += 10) dith(g, 64, y, 64, 1, q.d); // dikiş hatları
  R(g, 125, 71, 3, 31, q.d); dith(g, 64, 96, 64, 6, q.d);
  // Ayak tahtası
  R(g, 61, 101, 70, 8, OUT); const wd = ramp(WOOD_D); R(g, 62, 102, 68, 6, wd.m); R(g, 62, 102, 68, 1, wd.l); grain(g, 62, 103, 68, 4, wd.d, 21, 2);
  for (const lx of [62, 127]) { R(g, lx - 1, 108, 5, 4, OUT); R(g, lx, 108, 3, 3, wd.d); }
}

// ===================== Mutfak =====================
export function drawMutfak(g, col, wallpaper) {
  wall(g, col, wallpaper);
  // Fayans duvar (tezgah arkası)
  R(g, 0, 22, W, 28, '#ffffff');
  for (let y = 22; y < 50; y += 7) for (let x = (y / 7) % 2 ? 0 : 7; x < W; x += 14) R(g, x, y, 7, 7, '#e8f4f7');
  for (let y = 22; y < 50; y += 7) R(g, 0, y, W, 1, '#c8d8de');
  for (let y = 22, r = 0; y < 50; y += 7, r++) for (let x = r % 2 ? 0 : 7; x < W; x += 7) R(g, x, y, 1, 7, '#c8d8de');
  // Damalı zemin
  const fk = ramp(col.floor);
  for (let y = 50, r = 0; y < H; y += 8, r++) for (let x = 0; x < W; x += 8) {
    const c = (x / 8 + r) % 2 ? fk.m : shade(col.floor, -0.08);
    R(g, x, y, 8, 8, c); R(g, x, y, 8, 1, shade(c, 0.12)); R(g, x + 7, y + 1, 1, 7, shade(c, -0.12));
  }
  // Üst dolaplar
  R(g, 39, 3, 112, 18, OUT); const bl = ramp('#5b8def'), bll = ramp('#7aa4f5');
  R(g, 40, 4, 110, 16, bl.d);
  for (let x = 42; x < 148; x += 27) { R(g, x, 6, 25, 12, bll.m); R(g, x, 6, 25, 1, bll.h); R(g, x, 6, 1, 12, bll.l); R(g, x + 24, 6, 1, 12, bll.d); R(g, x + 1, 17, 24, 1, bll.d); R(g, x + 11, 14, 3, 2, OUT); R(g, x + 11, 14, 3, 1, GOLD); }
  dith(g, 40, 21, 110, 2, '#b8c8d0'); // dolap gölgesi
  // Tezgah gövdesi ve kapakları
  R(g, 33, 41, 152, 26, OUT);
  R(g, 34, 46, 150, 20, bl.m);
  for (let x = 38; x < 180; x += 24) { R(g, x - 1, 49, 24, 16, OUT); R(g, x, 50, 22, 14, bll.m); R(g, x, 50, 22, 1, bll.h); R(g, x, 50, 1, 14, bll.l); R(g, x + 21, 50, 1, 14, bll.d); R(g, x + 9, 52, 4, 1, GOLD); }
  const top = ramp('#e8e2d6'); R(g, 34, 42, 150, 4, top.m); R(g, 34, 42, 150, 1, top.h); R(g, 34, 45, 150, 1, top.d); dith(g, 36, 43, 146, 1, top.l);
  R(g, 34, 65, 150, 2, OUT); dith(g, 34, 66, 150, 1, bl.d2);
  // Lavabo ve musluk
  R(g, 43, 41, 24, 7, OUT); R(g, 44, 42, 22, 5, '#b8c4cc'); R(g, 46, 43, 18, 3, '#8fd0ff'); P(g, 47, 43, '#ffffff'); P(g, 48, 43, '#d8f0ff');
  R(g, 53, 35, 4, 8, OUT); R(g, 53, 35, 8, 3, OUT); R(g, 54, 36, 2, 7, '#c8d0d8'); R(g, 54, 36, 6, 1, '#c8d0d8'); P(g, 54, 36, '#ffffff');
  // Ocak ve fırın
  R(g, 95, 39, 36, 8, OUT); R(g, 96, 40, 34, 6, '#2e2e3a'); R(g, 96, 40, 34, 1, '#4a4752');
  for (const x of [100, 118]) { R(g, x, 41, 8, 4, '#4a4752'); R(g, x + 1, 42, 6, 2, '#1a1a22'); P(g, x + 3, 42, '#e0473f'); }
  R(g, 97, 49, 32, 16, OUT); R(g, 98, 50, 30, 14, '#2e2e3a'); R(g, 98, 50, 30, 1, '#4a4752');
  R(g, 100, 52, 26, 8, '#5a5560'); R(g, 102, 53, 22, 6, '#ffb36b'); dith(g, 102, 53, 22, 2, '#ffd08a'); R(g, 102, 61, 22, 1, '#9aa3ad');
  // Buzdolabı
  floorShadow(g, 150, 66, 30, 2, col.floor);
  R(g, 149, 9, 32, 58, OUT); const fr = ramp('#e8f4f7');
  R(g, 150, 10, 30, 56, fr.m); R(g, 150, 10, 30, 2, '#ffffff'); R(g, 150, 10, 1, 56, '#ffffff'); R(g, 178, 11, 2, 55, fr.d); dith(g, 151, 60, 27, 5, fr.d);
  R(g, 150, 30, 30, 1, OUT); R(g, 150, 31, 30, 1, fr.d);
  for (const [hy, hh] of [[16, 10], [34, 14]]) { R(g, 173, hy - 1, 4, hh + 2, OUT); R(g, 174, hy, 2, hh, '#c8d0d8'); P(g, 174, hy, '#ffffff'); }
  for (const [mx, my, c] of [[156, 14, '#ff5d8f'], [163, 18, '#ffc93c']]) { R(g, mx - 1, my - 1, 7, 6, OUT); R(g, mx, my, 5, 4, c); P(g, mx, my, '#ffffff'); }
  R(g, 153, 35, 10, 12, OUT); R(g, 154, 36, 8, 10, '#fff3dc'); R(g, 155, 37, 6, 1, '#e0473f'); R(g, 155, 39, 5, 1, '#9aa3ad'); R(g, 155, 41, 6, 1, '#9aa3ad'); R(g, 155, 43, 4, 1, '#9aa3ad');
  // Baharat rafı
  R(g, 65, 25, 26, 4, OUT); R(g, 66, 26, 24, 1, WOOD_L); R(g, 66, 27, 24, 1, WOOD_D);
  ['#e0473f', '#ffc93c', '#4fbf6a', '#c8742c', '#8a5a36'].forEach((c, i) => { const x = 67 + i * 5; R(g, x - 1, 19, 5, 7, OUT); R(g, x, 21, 3, 4, c); R(g, x, 20, 3, 1, '#fff6e8'); P(g, x, 21, shade(c, 0.4)); });
  // Kepçe askısı
  R(g, 91, 23, 42, 2, OUT); R(g, 92, 23, 40, 1, '#c8d0d8');
  for (const [x, c] of [[95, '#c8742c'], [104, '#9aa3ad'], [112, '#8a5a36'], [121, '#2e2e3a']]) { R(g, x, 25, 1, 6, '#6d7680'); R(g, x - 3, 30, 7, 5, OUT); R(g, x - 2, 31, 5, 3, c); P(g, x - 2, 31, shade(c, 0.4)); }
  // Bıçaklık
  R(g, 133, 25, 12, 10, OUT); R(g, 134, 26, 10, 8, '#5a3420'); R(g, 134, 26, 10, 1, '#7a4a2a');
  for (const [x, h] of [[135, 4], [138, 5], [141, 3]]) { R(g, x, 26 - h, 1, h, '#c8d0d8'); P(g, x, 26 - h, '#ffffff'); }
  // Tezgahın üstü: kesme tahtası, meyve kâsesi, çaydanlık
  R(g, 69, 38, 20, 6, OUT); R(g, 70, 39, 18, 4, '#c48b55'); R(g, 70, 39, 18, 1, '#e0a870');
  R(g, 72, 37, 4, 3, OUT); R(g, 72, 38, 4, 1, '#e0473f'); R(g, 78, 37, 3, 3, OUT); R(g, 78, 38, 3, 1, '#4fbf6a');
  R(g, 34, 36, 10, 8, OUT); R(g, 35, 41, 8, 2, '#5a3420'); R(g, 36, 39, 6, 2, '#ffc93c'); P(g, 36, 39, '#fff1a8'); R(g, 37, 37, 4, 2, '#4fbf6a'); P(g, 37, 37, '#8be08f');
  const kt = ramp('#e0473f');
  R(g, 131, 33, 12, 10, OUT); R(g, 132, 36, 9, 6, kt.m); R(g, 134, 34, 5, 2, kt.m); R(g, 132, 36, 9, 1, kt.h); R(g, 139, 37, 2, 5, kt.d); R(g, 141, 37, 2, 2, kt.m); R(g, 135, 33, 3, 1, '#2e2e3a');
  // Pencere önünde fesleğen
  R(g, 11, 27, 18, 4, OUT); R(g, 12, 28, 16, 2, WOOD_D); R(g, 12, 28, 16, 1, WOOD);
  for (const px of [14, 21]) { R(g, px - 1, 24, 7, 5, OUT); R(g, px, 25, 5, 3, '#c8742c'); P(g, px, 25, '#e89a50'); leaf(g, px + 2, 24, 4, -1, '#4fbf6a'); leaf(g, px + 2, 24, 4, 1, '#3f9b4f'); }
  // Yolluk halı
  R(g, 39, 75, 112, 12, OUT); R(g, 40, 76, 110, 10, '#e07a5f'); R(g, 42, 78, 106, 6, '#f2cc8f'); dith(g, 42, 78, 106, 1, '#f8dcaa');
  for (let x = 46; x < 146; x += 10) { R(g, x, 80, 4, 2, '#e07a5f'); P(g, x + 1, 79, '#e07a5f'); P(g, x + 2, 82, '#e07a5f'); }
  for (let x = 41; x < 150; x += 2) { P(g, x, 74, '#f2cc8f'); P(g, x, 87, '#f2cc8f'); }
  sideDoor(g, 'left');
  windowBox(g, 8, 4, 24, 26); // küçük pencere
}
export function drawMutfakDyn(g, t, hour, sky, decor) {
  sky(g, 10, 6, 20, 22, hour, t); windowBars(g, 10, 6, 20, 22);
  (decor.fridgeFood || []).forEach((c, i) => { const x = 151 + i * 6; R(g, x - 1, 4, 7, 7, OUT); R(g, x, 6, 5, 4, c); R(g, x, 5, 5, 1, '#ffffff'); });
  if (decor.cooking) {
    R(g, 98, 33, 14, 9, OUT); R(g, 99, 34, 12, 7, '#9aa3ad'); R(g, 99, 34, 12, 1, '#d8e0e8'); R(g, 109, 35, 2, 6, '#6d7680');
    for (let i = 0; i < 3; i++) { const y = 29 - ((t * 2 + i) % 2 | 0) * 3; R(g, 101 + i * 4, y, 1, 3, '#ffffff'); P(g, 102 + i * 4, y - 1, '#e8f0f4'); }
  }
}
export function kitchenTable(g) {
  floorShadow(g, 76, 111, 40, 2, '#d9c3a0');
  R(g, 73, 93, 46, 16, OUT); const tc = ramp('#ff7a59');
  R(g, 74, 94, 44, 14, tc.m); R(g, 74, 94, 44, 2, tc.l); P(g, 74, 94, tc.h);
  for (let x = 76; x < 116; x += 8) for (let y = 96; y < 106; y += 8) { R(g, x, y, 4, 4, '#fff3dc'); } // kareli örtü
  dith(g, 74, 104, 44, 4, tc.d); for (let x = 75; x < 118; x += 3) P(g, x, 107, tc.d2);
  for (const lx of [78, 111]) { R(g, lx - 1, 108, 5, 5, OUT); R(g, lx, 108, 3, 4, WOOD_D); }
  for (const px of [84, 100]) { R(g, px - 1, 95, 10, 6, OUT); R(g, px, 96, 8, 4, '#ffffff'); R(g, px + 2, 97, 4, 2, '#e8eef2'); } // tabaklar
}
