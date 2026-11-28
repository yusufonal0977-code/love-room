// Salon, piksel sanat sürümü (deneme). Ölçüler ve etkileşim noktaları eskisiyle aynı; yalnızca çizim değişti.
// Dil: şömine çizimleri gibi koyu dış hat, sol üstten ışık, 3-4 ton, noktalama, ahşap damarı.
import { R, shade } from './art.js';
import { P, OUT, ramp, dith, block, inset, grain, floorShadow, leaf, rng } from './pix.js';

const W = 192, H = 144, WALL = 50;
const WOOD = '#a8683c', WOOD_D = '#7a4426', TEAL = '#3fb7a4', CREAM = '#fff0dc', GOLD = '#ffc93c';

// ---------- Duvar ----------
export function wall(g, col, wallpaper) {
  wallpaper(g, col.wall, col.accent, col.motif); // desen boya ayarından gelir
  const k = ramp(col.wall);
  R(g, 0, 0, W, 2, k.d2); R(g, 0, 2, W, 1, k.d); dith(g, 0, 3, W, 2, k.d); // tavan gölgesi: koyu bant + noktalı geçiş
}
export function wainscot(g, cream = CREAM, trim = '#d9784f') {
  const c = ramp(cream), t = ramp(trim);
  R(g, 0, 37, W, 13, c.m);
  R(g, 0, 37, W, 1, t.l); R(g, 0, 38, W, 1, t.m); R(g, 0, 39, W, 1, t.o); // üst pervaz
  for (let x = 4; x < W; x += 24) {
    R(g, x, 41, 18, 5, c.m); R(g, x, 41, 18, 1, c.d); R(g, x, 41, 1, 5, c.d); // gömme panel
    R(g, x + 1, 45, 17, 1, c.h); R(g, x + 17, 42, 1, 4, c.h);
    dith(g, x + 2, 42, 14, 1, c.l, 1);
  }
  R(g, 0, 47, W, 1, t.l); R(g, 0, 48, W, 1, t.m); R(g, 0, 49, W, 1, t.d2); // süpürgelik
}

// ---------- Zemin: tek tek tahtalar ----------
export function floor(g, base) {
  const k = ramp(base), tones = [k.m, shade(base, 0.07), shade(base, -0.07)], r = rng(31);
  for (let y = WALL, row = 0; y < H; y += 6, row++) {
    const off = row % 2 ? 0 : 16;
    for (let x = off - 32; x < W; x += 32) {
      const tone = tones[(r() * 3) | 0];
      R(g, x, y, 32, 6, tone);
      R(g, x, y, 32, 1, k.l); // tahtanın üst kenarı ışık alır
      grain(g, x + 2, y + 2, 28, 3, shade(tone, -0.06), (row * 13 + x) | 0, 2);
      R(g, x, y, 1, 6, k.d2); // ek yeri
      if (r() < 0.12) { const nx = x + 6 + ((r() * 20) | 0); P(g, nx, y + 3, k.d2); P(g, nx + 1, y + 3, k.d); } // budak
    }
    R(g, 0, y + 5, W, 1, k.d); // tahtalar arası çizgi
  }
  // Duvar dibinde gölge
  R(g, 0, WALL, W, 1, k.d2); dith(g, 0, WALL + 1, W, 1, k.d);
}

// ---------- Pencere ve perde ----------
function windowFrame(g) {
  block(g, 6, 6, 28, 28, WOOD_D, { cut: 0 });
  R(g, 8, 8, 24, 24, '#5ec2ff'); // cam: gökyüzü dyn'de çizilir
  block(g, 4, 32, 32, 5, '#c98a55'); // pervaz
  dith(g, 5, 37, 30, 1, shade(CREAM, -0.2));
}
export function curtain(g, x, cloth = CREAM, tie = '#e0473f') {
  const k = ramp(cloth);
  R(g, x - 1, 4, 9, 35, OUT);
  for (let i = 0; i < 7; i++) R(g, x + i, 4, 1, 34, [k.l, k.m, k.d, k.m, k.l, k.m, k.d][i]); // kumaş kıvrımları
  for (let i = 0; i < 7; i += 2) P(g, x + i, 38, k.d); // dalgalı etek
  dith(g, x, 4, 7, 3, k.d); // korniş altı gölge
  R(g, x - 1, 22, 9, 2, OUT); R(g, x, 22, 7, 1, tie); R(g, x, 23, 7, 1, shade(tie, -0.3)); // bağ
}
function rod(g) {
  R(g, 0, 1, 40, 4, OUT); R(g, 1, 2, 38, 1, '#7d746c'); R(g, 1, 3, 38, 1, '#4a4340');
  block(g, 0, 0, 4, 5, GOLD, { cut: 1 }); block(g, 36, 0, 4, 5, GOLD, { cut: 1 });
}

// ---------- TV, hoparlör, TV ünitesi ----------
function tv(g) {
  R(g, 69, 9, 54, 34, OUT);
  const b = ramp('#2e2c36');
  R(g, 70, 10, 52, 32, b.m); R(g, 70, 10, 52, 1, b.l); R(g, 70, 10, 1, 32, b.l); R(g, 70, 41, 52, 1, b.d2); R(g, 121, 10, 1, 32, b.d2);
  R(g, 72, 12, 48, 28, OUT); // ekran çerçevesi içi (ekran dyn'de)
  P(g, 95, 40, '#6a6872'); P(g, 96, 40, '#9a98a2'); // logo ışığı
  R(g, 93, 42, 6, 2, OUT); R(g, 94, 42, 4, 1, '#5a5660');
}
function speaker(g, x) {
  const k = block(g, x, 29, 7, 16, '#2e2c36');
  const cone = (cy, r) => { R(g, x + 3 - r, cy - r + 1, r * 2 + 1, r * 2 - 1, OUT); R(g, x + 2 - r + 1, cy - r, r * 2 - 1, r * 2 + 1, OUT); R(g, x + 3 - r + 1, cy - r + 1, r * 2 - 1, r * 2 - 1, '#4a4752'); P(g, x + 3, cy, '#8a8794'); };
  cone(33, 1); cone(39, 2);
  P(g, x + 1, 43, k.h);
}
function tvUnit(g) {
  floorShadow(g, 60, 56, 74, 3, '#c98a55');
  R(g, 59, 43, 74, 14, OUT);
  const top = ramp('#c98a55');
  R(g, 60, 44, 72, 3, top.m); R(g, 60, 44, 72, 1, top.h); grain(g, 61, 44, 70, 3, top.d, 5, 1); // üst yüzey (derinlik)
  R(g, 60, 47, 72, 1, OUT);
  const f = ramp(WOOD);
  R(g, 60, 48, 72, 8, f.m); grain(g, 60, 48, 72, 8, f.d, 9);
  for (const dx of [63, 85, 107]) {
    R(g, dx - 1, 49, 24, 6, OUT); inset(g, dx, 50, 22, 4, WOOD_D);
    R(g, dx + 9, 51, 4, 1, OUT); R(g, dx + 10, 51, 2, 1, GOLD); // kulp
  }
  R(g, 61, 56, 3, 2, OUT); R(g, 128, 56, 3, 2, OUT); P(g, 62, 56, f.d); P(g, 129, 56, f.d);
}
function recordCabinet(g) {
  floorShadow(g, 134, 56, 22, 3, '#c98a55');
  R(g, 133, 41, 24, 16, OUT);
  const k = ramp(WOOD_D);
  R(g, 134, 42, 22, 2, shade('#c98a55', 0.05)); R(g, 134, 42, 22, 1, ramp('#c98a55').h); // üst yüzey
  R(g, 134, 44, 22, 12, k.m); grain(g, 134, 44, 22, 12, k.d, 3);
  R(g, 136, 46, 18, 8, OUT); R(g, 137, 47, 16, 7, '#3a2418'); dith(g, 137, 47, 16, 2, '#24160f');
  ['#ff5d8f', '#ffc93c', '#5b8def', '#fff3dc', '#3fb7a4'].forEach((c, i) => {
    const kk = ramp(c), x = 138 + i * 3, y = 48 + (i % 2);
    R(g, x, y, 2, 6 - (i % 2), kk.m); P(g, x, y, kk.h); R(g, x + 1, y + 1, 1, 5 - (i % 2), kk.d); // plak kılıfları
  });
  R(g, 135, 56, 2, 2, OUT); R(g, 153, 56, 2, 2, OUT);
}

// ---------- Arka kapı ----------
function backDoor(g) {
  R(g, 157, 13, 28, 40, OUT);
  const casing = ramp(WOOD_D);
  R(g, 158, 14, 26, 39, casing.m); R(g, 158, 14, 26, 1, casing.l); R(g, 158, 14, 1, 39, casing.l);
  R(g, 160, 16, 22, 37, OUT);
  const d = ramp('#c98a55');
  R(g, 161, 17, 20, 36, d.m); grain(g, 161, 17, 20, 36, d.d, 17, 3);
  for (const [py, ph] of [[19, 13], [35, 15]]) { // kabartmalı paneller
    R(g, 163, py, 16, ph, d.d); R(g, 164, py + 1, 14, ph - 2, d.m); R(g, 164, py + 1, 14, 1, d.l); R(g, 164, py + 1, 1, ph - 2, d.l);
    R(g, 164, py + ph - 2, 14, 1, d.d2); R(g, 177, py + 2, 1, ph - 3, d.d2);
  }
  R(g, 176, 32, 4, 4, OUT); R(g, 177, 33, 2, 2, GOLD); P(g, 177, 33, '#fff1a8'); // tokmak
  // Paspas
  R(g, 159, 52, 24, 5, OUT); R(g, 160, 53, 22, 3, '#b8552f');
  for (let x = 161; x < 181; x += 3) R(g, x, 53, 1, 3, '#e0794a');
}

// ---------- Kilim ----------
function rug(g) {
  const x = 56, y = 64, w = 80, h = 28;
  floorShadow(g, x + 1, y + h, w - 2, 1, '#c98a55');
  for (let fx = x + 2; fx < x + w - 2; fx += 2) { P(g, fx, y - 2, '#fff3dc'); P(g, fx, y - 1, fx % 4 ? '#e6d4b4' : '#fff3dc'); P(g, fx, y + h, '#fff3dc'); P(g, fx, y + h + 1, fx % 4 ? '#e6d4b4' : '#fff3dc'); } // saçaklar
  R(g, x, y, w, h, '#8a241f');
  const red = ramp('#e0473f'), org = ramp('#ffb547'), blu = ramp('#2f5d8f');
  R(g, x + 1, y + 1, w - 2, h - 2, red.m);
  for (let i = x + 3; i < x + w - 3; i += 4) { P(g, i, y + 2, red.h); P(g, i + 2, y + h - 3, red.d); } // kenar dokusu
  R(g, x + 4, y + 4, w - 8, h - 8, red.d2);
  R(g, x + 5, y + 5, w - 10, h - 10, org.m); dith(g, x + 5, y + 5, w - 10, 1, org.l);
  R(g, x + 8, y + 8, w - 16, h - 16, org.d2);
  R(g, x + 9, y + 9, w - 18, h - 18, blu.m); dith(g, x + 9, y + h - 11, w - 18, 2, blu.d);
  for (let i = 0; i < 5; i++) { // baklava motifleri
    const cx = x + w / 2 - 24 + i * 12, cy = y + h / 2;
    R(g, cx - 1, cy - 3, 3, 7, '#fff3dc'); R(g, cx - 3, cy - 1, 7, 3, '#fff3dc'); R(g, cx - 2, cy - 2, 5, 5, '#fff3dc');
    P(g, cx, cy, i % 2 ? '#e0473f' : '#ffb547');
  }
}

// ---------- Kanepe ----------
const SOFA = ramp(TEAL);
function sofaSeat(g) { // oturma minderleri (oturanların arkasında kalır)
  R(g, 55, 97, 82, 16, OUT);
  for (const sx of [56, 96]) {
    R(g, sx, 98, 40, 14, SOFA.d); R(g, sx + 1, 98, 38, 12, SOFA.m);
    R(g, sx + 1, 98, 38, 2, SOFA.l); P(g, sx + 2, 98, SOFA.h); P(g, sx + 3, 98, SOFA.h);
    dith(g, sx + 1, 108, 38, 2, SOFA.d);
  }
  R(g, 95, 98, 1, 14, SOFA.o);
}
export function sofaBack(g) { // sırt ve kolçaklar (oturanların önünde)
  floorShadow(g, 52, 128, 88, 2, '#c98a55');
  // Kolçaklar: yuvarlak üst
  for (const ax of [51, 130]) {
    R(g, ax + 1, 97, 9, 31, OUT); R(g, ax, 98, 11, 29, OUT);
    R(g, ax + 1, 98, 9, 29, SOFA.d); R(g, ax + 2, 98, 7, 2, SOFA.l); P(g, ax + 2, 98, SOFA.h);
    R(g, ax + 1, 101, 1, 25, SOFA.m); dith(g, ax + 2, 120, 7, 6, SOFA.d2);
  }
  // Sırt: iki yastık, dikiş ve kapitone düğmeler
  R(g, 57, 110, 78, 18, OUT);
  for (const bx of [58, 96]) {
    R(g, bx, 111, 38, 16, SOFA.m);
    R(g, bx, 111, 38, 2, SOFA.l); P(g, bx + 1, 111, SOFA.h); P(g, bx + 2, 111, SOFA.h);
    R(g, bx, 125, 38, 2, SOFA.d); dith(g, bx, 121, 38, 4, SOFA.d);
    for (let x = bx + 6; x < bx + 36; x += 10) { P(g, x, 118, SOFA.o); P(g, x + 1, 118, SOFA.d2); P(g, x, 117, SOFA.l); }
  }
  R(g, 95, 111, 2, 16, SOFA.o); P(g, 95, 111, SOFA.d);
  // Ayaklar
  for (const lx of [53, 135]) { R(g, lx, 127, 4, 3, OUT); P(g, lx + 1, 127, '#7a4426'); P(g, lx + 2, 127, '#5a3018'); }
}

// ---------- Lambader ----------
export function lamp(g, on) {
  floorShadow(g, 23, 119, 14, 2, '#c98a55');
  R(g, 23, 116, 14, 4, OUT); R(g, 24, 117, 12, 2, '#4a4340'); R(g, 25, 117, 10, 1, '#7d746c'); // taban
  R(g, 28, 78, 4, 39, OUT); R(g, 29, 78, 1, 39, '#7d746c'); R(g, 30, 78, 1, 39, '#3a3330'); // gövde
  const k = ramp(on ? '#ffe08a' : '#d6c08f');
  // Abajur: yamuk
  for (let j = 0; j < 10; j++) {
    const half = 5 + Math.round(j * 0.35);
    R(g, 30 - half - 1, 69 + j, half * 2 + 2, 1, OUT);
    R(g, 30 - half, 69 + j, half * 2, 1, j < 2 ? k.l : k.m);
    P(g, 30 + half - 1, 69 + j, k.d); P(g, 30 + half - 2, 69 + j, j % 2 ? k.d : k.m);
  }
  R(g, 24, 79, 13, 1, OUT);
  for (let x = 25; x < 36; x += 3) R(g, x, 72, 1, 6, k.d); // kumaş çizgileri
  if (on) { P(g, 27, 70, k.h); P(g, 28, 70, k.h); dith(g, 25, 78, 10, 1, '#fff6c8'); }
}

// ---------- Kavanoz masası ----------
export function jarTable(g) {
  floorShadow(g, 144, 118, 16, 2, '#c98a55');
  R(g, 143, 103, 18, 5, OUT); R(g, 144, 104, 16, 1, ramp('#c98a55').h); R(g, 144, 105, 16, 2, WOOD);
  R(g, 145, 108, 4, 11, OUT); R(g, 155, 108, 4, 11, OUT); R(g, 146, 108, 2, 10, WOOD_D); R(g, 156, 108, 2, 10, WOOD_D); P(g, 146, 108, WOOD);
  // Kavanoz
  R(g, 146, 92, 12, 12, OUT); R(g, 145, 93, 14, 10, OUT);
  R(g, 147, 94, 10, 9, '#cfeefa'); R(g, 146, 95, 1, 7, '#cfeefa');
  [['#ff7aa3', 148, 99], ['#ffc93c', 151, 100], ['#8fd0ff', 149, 101], ['#9ee6a8', 153, 97], ['#ffffff', 154, 100]].forEach(([c, x, y]) => { R(g, x, y, 2, 2, c); P(g, x + 1, y + 1, shade(c, -0.25)); });
  R(g, 147, 95, 1, 6, '#ffffff'); P(g, 148, 95, '#ffffff'); R(g, 156, 96, 1, 5, '#9cc8d8'); // cam parlaması
  R(g, 146, 90, 12, 3, OUT); R(g, 147, 91, 10, 1, '#ff6a5a'); R(g, 147, 92, 10, 1, '#b8322c'); // kapak
  R(g, 148, 88, 8, 3, OUT); R(g, 149, 89, 6, 1, '#ff8a7a');
}

// ---------- Saksı bitkisi ----------
export function plant(g, x, y, small = false) {
  floorShadow(g, x - 6, y, 12, 1, '#c98a55');
  if (small) return smallPlant(g, x, y);
  // Yapraklar (arkadan öne)
  leaf(g, x - 2, y - 10, 13, -1, '#2e8a4e'); leaf(g, x + 2, y - 10, 13, 1, '#2e8a4e');
  leaf(g, x - 1, y - 12, 17, -0.45, '#3fae5a'); leaf(g, x + 1, y - 12, 18, 0.4, '#3fae5a');
  leaf(g, x, y - 11, 14, 0, '#4fbf6a'); leaf(g, x - 1, y - 11, 9, -1, '#5fcf7a'); leaf(g, x + 1, y - 11, 8, 1, '#5fcf7a');
  // Saksı
  R(g, x - 7, y - 12, 14, 4, OUT); R(g, x - 6, y - 11, 12, 2, '#f39a6a'); P(g, x - 5, y - 11, '#ffd0b0');
  R(g, x - 6, y - 9, 12, 10, OUT); R(g, x - 5, y - 9, 10, 9, '#e0794a');
  R(g, x - 5, y - 9, 2, 9, '#f39a6a'); R(g, x + 2, y - 9, 3, 9, '#b8552f'); dith(g, x - 3, y - 3, 5, 3, '#b8552f');
}

function smallPlant(g, x, y) {
  leaf(g, x - 1, y - 7, 8, -1, '#2e8a4e'); leaf(g, x + 1, y - 7, 8, 1, '#3fae5a'); leaf(g, x, y - 8, 10, 0, '#4fbf6a');
  R(g, x - 5, y - 8, 10, 3, OUT); R(g, x - 4, y - 7, 8, 1, '#f39a6a');
  R(g, x - 4, y - 6, 8, 7, OUT); R(g, x - 3, y - 6, 6, 6, '#e0794a'); R(g, x - 3, y - 6, 1, 6, '#f39a6a'); R(g, x + 1, y - 6, 2, 6, '#b8552f');
}

// ---------- Yan kapılar ----------
export function sideDoor(g, side) {
  const x = side === 'left' ? 0 : W - 6;
  R(g, x, 73, 6, 44, OUT);
  const k = ramp(WOOD_D);
  R(g, side === 'left' ? 0 : W - 5, 74, 5, 42, k.m); R(g, side === 'left' ? 4 : W - 5, 74, 1, 42, k.l);
  R(g, side === 'left' ? 0 : W - 4, 76, 3, 38, '#1e140e'); dith(g, side === 'left' ? 0 : W - 4, 76, 3, 38, '#2a1c14');
  // Kapı önü paspası
  const mx = side === 'left' ? 5 : W - 18;
  R(g, mx, 91, 13, 12, OUT); R(g, mx + 1, 92, 11, 10, '#b48a54'); R(g, mx + 1, 92, 11, 1, '#d8b47c');
  for (let i = mx + 2; i < mx + 12; i += 2) dith(g, i, 94, 1, 6, '#9a7040');
}

// ---------- Duvar tablosu ----------
function wallFrame(g) {
  R(g, 41, 11, 22, 18, 'rgba(0,0,0,0)');
  dith(g, 42, 29, 20, 1, shade('#ff9a76', -0.3)); // tablo gölgesi
  R(g, 40, 10, 22, 18, OUT); R(g, 41, 11, 20, 16, WOOD_D); R(g, 42, 12, 18, 14, GOLD); P(g, 42, 12, '#fff1a8'); R(g, 59, 13, 1, 13, '#c8901c');
  R(g, 43, 13, 16, 12, OUT); // iç (foto ya da resim dyn/frameArt ile)
}

// ---------- Dışa açık çizim girişleri ----------
export function drawSalon(g, col, wallpaper) {
  wall(g, col, wallpaper);
  wainscot(g);
  floor(g, col.floor);
  windowFrame(g); curtain(g, 2); curtain(g, 32); rod(g);
  speaker(g, 62); speaker(g, 123); tv(g);
  tvUnit(g); recordCabinet(g);
  backDoor(g);
  rug(g);
  sofaSeat(g);
  sideDoor(g, 'left'); sideDoor(g, 'right');
}

/** Canlı parçalar: pencere kayıtları, TV ekranı, pikap, mama kabı. Gökyüzünü scenes.js çizer. */
export function drawSalonDyn(g, { st, t }, decor) {
  // Pencere kayıtları ve cam yansıması
  R(g, 19, 8, 2, 24, OUT); R(g, 8, 19, 24, 2, OUT); P(g, 19, 8, '#7a4426');
  P(g, 10, 10, '#ffffff'); P(g, 11, 11, '#ffffff'); P(g, 10, 12, '#e8f6ff'); P(g, 23, 10, '#ffffff'); P(g, 24, 11, '#e8f6ff');
  // TV ekranı
  if (decor.tvOn) R(g, 73, 13, 46, 26, '#000');
  else if (st.tv) {
    const k = (t * 2 | 0) % 3;
    R(g, 73, 13, 46, 26, ['#7ab8ff', '#9ad0ff', '#86c4ff'][k]); R(g, 73, 31, 46, 8, '#4fbf6a'); dith(g, 73, 31, 46, 1, '#86c4ff');
    R(g, 80 + k * 4, 18, 8, 8, '#fff1c8'); R(g, 106, 20 - k, 5, 5, '#ffffff');
    for (let y = 13; y < 39; y += 2) dith(g, 73, y, 46, 1, 'rgba(0,0,0,0.08)'); // tarama çizgisi
  } else {
    R(g, 73, 13, 46, 26, '#141218');
    for (let i = 0; i < 9; i++) { P(g, 76 + i, 23 - i, '#2c2a34'); P(g, 79 + i, 26 - i, '#24222c'); } // kapalı ekran yansıması
    R(g, 74, 14, 10, 1, '#2c2a34');
  }
  // Pikap
  R(g, 135, 35, 20, 7, OUT); R(g, 136, 36, 18, 5, '#5a3a28'); R(g, 136, 36, 18, 1, '#7a5238');
  const spin = decor.music ? (t * 6 | 0) % 2 : 0;
  R(g, 138, 35, 11, 4, OUT); R(g, 139, 35, 9, 3, '#1c1a20'); P(g, 140, 35, '#3a3842');
  R(g, 142, 36, 3, 1, spin ? '#ff5d8f' : '#ffc93c');
  R(g, 151, 32, 1, 6, '#d8d0c0'); R(g, 148, 32, 3, 1, '#d8d0c0'); P(g, 147, 33, '#8a8794');
  if (decor.music) for (let i = 0; i < 3; i++) {
    const p = (t * 0.6 + i / 3) % 1, nx = Math.round(142 + Math.sin(p * 6 + i) * 6), ny = Math.round(32 - p * 22), c = ['#ffd27a', '#ff7aa3', '#8fd0ff'][i];
    R(g, nx - 1, ny - 1, 4, 4, OUT); R(g, nx, ny, 2, 2, c); R(g, nx + 2, ny - 4, 1, 4, OUT); R(g, nx + 1, ny - 3, 1, 3, c);
  }
  // Mama kabı
  R(g, 39, 63, 12, 6, OUT); R(g, 40, 65, 10, 3, '#5b8def'); R(g, 40, 64, 10, 1, '#8fb0ff'); R(g, 41, 67, 8, 1, '#3a63b8');
  if (decor.pet.food > 25) { R(g, 41, 63, 8, 2, '#c8742c'); P(g, 42, 63, '#e89a50'); P(g, 45, 63, '#e89a50'); P(g, 47, 64, '#8a4a1c'); }
}
