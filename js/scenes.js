// Dört sahne: Salon (merkez), Şömine odası (sol kapı), Balkon (sağ kapı), Hobi köşesi (arka kapı).
// Her sahne: statik arka plan (bir kez çizilir), canlı parçalar, y'ye göre sıralanan ön plan eşyaları,
// çarpışma kutuları, kapılar, etkileşim noktaları, oturma yerleri ve ışık kaynakları.
import { R } from './art.js';

export const W = 192, H = 144, WALL = 50;

// ---------- Ortak çizim parçaları ----------
const C = {
  wood: '#a8683c', woodL: '#c98a55', woodD: '#7a4426', dark: '#3a2418',
  leaf: '#4fbf6a', leaf2: '#2e8a4e', pot: '#e0794a', pot2: '#b8552f',
  cream: '#fff3dc', cream2: '#f1dfbf', metal: '#3a3330', gold: '#ffc93c',
};

function wallpaper(g, base, accent, motif) {
  R(g, 0, 0, W, WALL, base);
  if (motif === 'diamond') for (let y = 8; y < WALL - 10; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) { R(g, x + 3, y, 2, 1, accent); R(g, x + 2, y + 1, 4, 1, accent); R(g, x + 3, y + 2, 2, 1, accent); }
  if (motif === 'dots') for (let y = 6; y < WALL - 10; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < W; x += 6) R(g, x + 1, y, 1, 1, accent);
  if (motif === 'stripes') for (let x = 0; x < W; x += 10) R(g, x, 0, 4, WALL, accent);
  R(g, 0, 0, W, 3, 'rgba(0,0,0,0.12)'); // tavan gölgesi
}
function wainscot(g, col, trim) {
  R(g, 0, WALL - 12, W, 12, col);
  for (let x = 4; x < W; x += 24) { R(g, x, WALL - 9, 18, 1, 'rgba(255,255,255,0.25)'); R(g, x, WALL - 9, 1, 6, 'rgba(255,255,255,0.25)'); R(g, x, WALL - 3, 18, 1, 'rgba(0,0,0,0.15)'); }
  R(g, 0, WALL - 13, W, 2, trim);
  R(g, 0, WALL - 2, W, 2, trim);
}
function woodFloor(g, c1, c2, line) {
  R(g, 0, WALL, W, H - WALL, c1);
  for (let y = WALL; y < H; y += 6) {
    R(g, 0, y, W, 1, line);
    R(g, 0, y + 1, W, 1, c2);
    const off = ((y - WALL) / 6) % 2 ? 0 : 16;
    for (let x = off; x < W; x += 32) R(g, x, y, 1, 6, line);
  }
}
function tileFloor(g, y0, c1, c2) {
  R(g, 0, y0, W, H - y0, c1);
  for (let y = y0; y < H; y += 8) for (let x = ((y - y0) / 8) % 2 ? 0 : 8; x < W; x += 16) R(g, x, y, 8, 8, c2);
  for (let y = y0; y < H; y += 8) R(g, 0, y, W, 1, 'rgba(0,0,0,0.12)');
}
function plant(g, x, y, big) {
  const s = big ? 1 : 0.7;
  R(g, x - 6 * s, y - 10 * s, 12 * s, 10 * s, C.pot); R(g, x - 6 * s, y - 10 * s, 12 * s, 2, '#f39a6a'); R(g, x - 5 * s, y - 2, 10 * s, 2, C.pot2);
  R(g, x - 10 * s, y - 24 * s, 8 * s, 12 * s, C.leaf); R(g, x + 2 * s, y - 26 * s, 9 * s, 14 * s, C.leaf2); R(g, x - 4 * s, y - 32 * s, 7 * s, 12 * s, C.leaf);
  R(g, x - 8 * s, y - 22 * s, 2, 6, '#8be08f');
}
function sideDoor(g, side, wallCol) {
  const x = side === 'left' ? 0 : W - 5;
  R(g, x, 74, 5, 42, C.woodD); R(g, side === 'left' ? 0 : W - 3, 76, 3, 38, '#1e140e');
  R(g, side === 'left' ? 5 : W - 17, 92, 12, 10, '#c9a36b'); R(g, side === 'left' ? 6 : W - 16, 93, 10, 8, '#b48a54');
  R(g, side === 'left' ? 1 : W - 4, 70, 3, 4, wallCol);
}
function rug(g, x, y, w, h, outer, inner, mid, dots) {
  R(g, x, y, w, h, '#fff3dc'); R(g, x + 2, y + 2, w - 4, h - 4, outer); R(g, x + 5, y + 5, w - 10, h - 10, inner);
  R(g, x + 9, y + 9, w - 18, h - 18, mid);
  for (let i = 0; i < 5; i++) R(g, x + w / 2 - 26 + i * 12, y + h / 2 - 2, 5, 4, dots);
  for (let fx = x + 2; fx < x + w - 2; fx += 4) { R(g, fx, y - 2, 1, 2, '#fff3dc'); R(g, fx, y + h, 1, 2, '#fff3dc'); }
}
function frame(g, x, y, w, h, art) {
  R(g, x + 1, y + 1, w, h, 'rgba(0,0,0,0.2)');
  R(g, x, y, w, h, C.woodD); R(g, x + 2, y + 2, w - 4, h - 4, C.cream);
  art(x + 3, y + 3, w - 6, h - 6);
}

// ---------- Gökyüzü (pencere ve balkon) ----------
export function skyColors(hour) {
  if (hour < 5.5 || hour >= 20.5) return ['#141a3d', '#2a2f63', true];
  if (hour < 8) return ['#ff9e7a', '#ffd6a0', false];
  if (hour < 17) return ['#5ec2ff', '#bfe8ff', false];
  if (hour < 19.3) return ['#ff8a4c', '#ffcf6e', false];
  return ['#4b3f8a', '#f08a6a', true];
}
function drawSky(g, x, y, w, h, hour, t) {
  const [top, bottom, night] = skyColors(hour);
  const grd = g.createLinearGradient(0, y, 0, y + h);
  grd.addColorStop(0, top); grd.addColorStop(1, bottom);
  g.fillStyle = grd; g.fillRect(x, y, w, h);
  if (night) {
    for (let i = 0; i < 14; i++) {
      const sx = x + ((i * 37) % w), sy = y + ((i * 23) % Math.max(4, h - 10));
      if ((Math.sin(t * 2 + i) + 1) / 2 > 0.25) R(g, sx, sy, 1, 1, '#fff6c8');
    }
    R(g, x + w * 0.72, y + 4, 6, 6, '#fff6d8'); R(g, x + w * 0.72 + 2, y + 3, 5, 5, top);
  } else {
    const sunY = y + (hour < 12 ? h - (hour - 6) * 3 : 4 + (hour - 12) * 2.6);
    R(g, x + w * 0.7, Math.max(y + 2, Math.min(y + h - 8, sunY)), 7, 7, '#fff1a8');
    const cx = x + ((t * 3) % (w + 20)) - 20;
    R(g, cx, y + 6, 14, 3, '#ffffff'); R(g, cx + 3, y + 4, 8, 2, '#ffffff');
  }
}

// ---------- Sahneler ----------
function makeScene(def) {
  const bg = document.createElement('canvas');
  bg.width = W; bg.height = H;
  def.draw(bg.getContext('2d'));
  return { ...def, bg };
}

/** Salon: TV, kanepe, kilim, sehpa, lambader, kedi. Üç kapı: sol (şömine), sağ (balkon), arka (hobi). */
const salon = makeScene({
  id: 'salon',
  name: 'Salon',
  draw(g) {
    wallpaper(g, '#ff9a76', '#ffb999', 'diamond');
    wainscot(g, '#fff0dc', '#d9784f');
    woodFloor(g, '#c98a55', '#d99a63', '#9c6236');
    // Pencere çerçevesi (gökyüzü canlı çizilir)
    R(g, 38, 6, 36, 30, '#7a4426'); R(g, 40, 8, 32, 26, '#5ec2ff');
    R(g, 34, 4, 8, 34, '#fff3dc'); R(g, 70, 4, 8, 34, '#fff3dc'); R(g, 36, 4, 1, 34, '#e6cfa6'); R(g, 74, 4, 1, 34, '#e6cfa6');
    R(g, 32, 2, 48, 2, C.metal); R(g, 38, 35, 36, 3, C.woodL);
    // Kanepe üstü çerçeve
    frame(g, 88, 10, 18, 15, (x, y, w, h) => { R(g, x, y, w, h, '#ffd27a'); R(g, x, y + h - 4, w, 4, '#3fb7a4'); R(g, x + 6, y + 2, 4, 4, '#ff7a59'); });
    // Raf
    R(g, 118, 22, 30, 2, C.wood); R(g, 118, 24, 30, 1, C.woodD);
    R(g, 121, 16, 6, 6, C.pot); R(g, 120, 12, 8, 5, C.leaf); R(g, 131, 14, 3, 8, '#ff5d8f'); R(g, 134, 15, 3, 7, '#5b8def'); R(g, 137, 13, 3, 9, '#ffc93c');
    R(g, 142, 18, 4, 4, '#fff3dc'); R(g, 143, 16, 2, 2, '#ffd27a');
    // Arka kapı (hobi köşesine)
    R(g, 158, 14, 26, 38, C.woodD); R(g, 160, 16, 22, 36, '#c98a55'); R(g, 162, 18, 18, 14, '#b47744'); R(g, 162, 34, 18, 16, '#b47744'); R(g, 177, 33, 2, 2, C.gold);
    R(g, 160, 52, 22, 4, '#c9a36b');
    // TV ünitesi
    R(g, 4, 52, 34, 12, C.wood); R(g, 4, 52, 34, 2, C.woodL); R(g, 6, 56, 14, 6, C.woodD); R(g, 22, 56, 14, 6, C.woodD);
    R(g, 6, 64, 2, 3, C.woodD); R(g, 34, 64, 2, 3, C.woodD);
    R(g, 5, 28, 32, 22, '#1d1b22'); R(g, 20, 50, 2, 2, C.metal);
    // Kanepe (karşıya bakan, turkuaz)
    const sx = 64, sy = 40, s1 = '#2f9e8f', s2 = '#3fb7a4', s3 = '#6fd6c5';
    R(g, sx, sy, 64, 18, s1); R(g, sx + 2, sy + 2, 60, 14, s2); R(g, sx + 2, sy + 2, 60, 2, s3);
    R(g, sx - 4, sy + 10, 10, 22, s1); R(g, sx + 58, sy + 10, 10, 22, s1);
    R(g, sx - 3, sy + 11, 8, 2, s3); R(g, sx + 59, sy + 11, 8, 2, s3);
    R(g, sx + 6, sy + 18, 26, 10, s2); R(g, sx + 32, sy + 18, 26, 10, s2);
    R(g, sx + 6, sy + 18, 52, 2, s3); R(g, sx + 31, sy + 18, 2, 10, s1);
    R(g, sx + 4, sy + 28, 56, 4, s1);
    R(g, sx - 2, sy + 32, 2, 3, C.woodD); R(g, sx + 64, sy + 32, 2, 3, C.woodD);
    R(g, sx + 8, sy + 6, 10, 9, '#ffc93c'); R(g, sx + 46, sy + 6, 10, 9, '#ff7a59');
    // Kilim
    rug(g, 52, 78, 88, 34, '#e0473f', '#ffb547', '#2f5d8f', '#fff3dc');
    sideDoor(g, 'left', '#ff9a76'); sideDoor(g, 'right', '#ff9a76');
  },
  dyn(g, { st, hour, t }) {
    drawSky(g, 40, 8, 32, 26, hour, t);
    R(g, 55, 8, 2, 26, '#7a4426'); R(g, 40, 20, 32, 2, '#7a4426');
    // TV ekranı
    if (st.tv) {
      const k = (t * 2 | 0) % 3;
      R(g, 7, 30, 28, 18, ['#7ab8ff', '#9ad0ff', '#86c4ff'][k]); R(g, 7, 42, 28, 6, '#4fbf6a');
      R(g, 11 + k * 3, 34, 6, 6, '#fff1c8'); R(g, 25, 36 - k, 4, 4, '#ffffff');
    } else { R(g, 7, 30, 28, 18, '#121016'); R(g, 8, 31, 8, 1, '#3a3842'); }
  },
  props: [
    { y: 96, draw(g) { R(g, 80, 86, 32, 8, C.wood); R(g, 80, 86, 32, 2, C.woodL); R(g, 82, 94, 2, 4, C.woodD); R(g, 108, 94, 2, 4, C.woodD); R(g, 86, 82, 6, 5, '#fff3dc'); R(g, 98, 81, 8, 5, '#e0473f'); R(g, 99, 79, 6, 3, '#fff6e0'); } },
    { y: 74, draw(g, { st }) { R(g, 148, 34, 2, 38, C.metal); R(g, 144, 72, 10, 2, C.metal); R(g, 142, 26, 14, 9, st.lamp ? '#ffe08a' : '#d6c08f'); R(g, 143, 26, 12, 1, '#fff6c8'); } },
    { y: 126, draw(g) { plant(g, 18, 126, true); } },
    { y: 128, draw(g) { plant(g, 172, 128, true); } },
  ],
  blocks: [[0, 0, W, 54], [2, 50, 38, 18], [58, 46, 76, 26], [142, 70, 12, 4], [78, 88, 36, 10], [8, 116, 20, 12], [162, 118, 20, 10]],
  doors: [
    { x: 4, y: 84, w: 6, h: 26, to: 'somine', spawn: { x: 176, y: 96, dir: 'left' } },
    { x: 182, y: 84, w: 6, h: 26, to: 'balkon', spawn: { x: 16, y: 100, dir: 'right' } },
    { x: 160, y: 55, w: 22, h: 5, to: 'hobi', spawn: { x: 96, y: 126, dir: 'up' } },
  ],
  spots: [
    { id: 'sofa', x: 96, y: 76, hit: [58, 40, 76, 32], label: () => 'Otur' },
    { id: 'tv', x: 22, y: 72, hit: [4, 26, 36, 42], label: (st) => (st.tv ? "TV'yi kapat" : "TV'yi aç") },
    { id: 'lamp', x: 148, y: 80, hit: [140, 24, 18, 50], label: (st) => (st.lamp ? 'Lambayı söndür' : 'Lambayı yak') },
    { id: 'cat', dynamic: true, label: () => 'Sev' },
  ],
  seats: [{ x: 84, y: 66 }, { x: 108, y: 66 }],
  lights: ({ st, t }) => [
    st.lamp && { x: 149, y: 40, r: 72, a: 0.95, color: '255,190,100' },
    st.tv && { x: 21, y: 40, r: 52 + Math.sin(t * 9) * 2, a: 0.85, color: '120,170,255' },
    { x: 56, y: 22, r: 34, a: 0.5, color: '200,220,255' },
  ],
  hasCat: true,
});

/** Şömine odası: tuğla şömine, tablolar, kitaplık, berjer, ilişki saati. Sağ kapı → salon. */
const somine = makeScene({
  id: 'somine',
  name: 'Şömine odası',
  draw(g) {
    wallpaper(g, '#1f7a7a', '#2f9a95', 'dots');
    wainscot(g, '#165e5e', '#e0b25a');
    woodFloor(g, '#8a4f2c', '#9b5d35', '#6a3a1f');
    // Tablolar
    frame(g, 20, 12, 26, 20, (x, y, w, h) => { R(g, x, y, w, h, '#ffb070'); R(g, x, y + h - 6, w, 6, '#b5543a'); R(g, x + w - 8, y + 3, 4, 4, '#fff1a8'); R(g, x + 2, y + h - 9, w - 6, 3, '#d9784f'); });
    frame(g, 148, 10, 24, 22, (x, y, w, h) => { R(g, x, y, w, h, '#f6efe0'); R(g, x + w / 2 - 1, y + 2, 2, h - 4, '#6b5440'); R(g, x + 3, y + 5, 6, 3, '#4fbf6a'); R(g, x + w - 9, y + 8, 6, 3, '#2e8a4e'); R(g, x + 3, y + 12, 6, 3, '#2e8a4e'); });
    // İlişki saati
    R(g, 125, 14, 16, 16, '#e0b25a'); R(g, 127, 16, 12, 12, '#fff3dc'); R(g, 132, 18, 2, 5, '#3a2418'); R(g, 132, 22, 4, 2, '#3a2418'); R(g, 132, 16, 2, 1, '#e0473f');
    // Kitaplık (sol)
    R(g, 2, 18, 30, 46, C.woodD); R(g, 4, 20, 26, 42, '#3a2418');
    const books = ['#ff7a59', '#ffc93c', '#5b8def', '#4fbf6a', '#ff5d8f', '#fff3dc'];
    for (let s = 0; s < 3; s++) { for (let i = 0; i < 6; i++) R(g, 5 + i * 4, 22 + s * 14 + (i % 2), 3, 11 - (i % 2), books[(i + s) % 6]); R(g, 4, 33 + s * 14, 26, 2, C.wood); }
    // Şömine
    R(g, 72, 10, 48, 4, C.woodL); R(g, 70, 14, 52, 4, C.wood);
    R(g, 74, 18, 44, 46, '#c4533a');
    for (let y = 18; y < 64; y += 4) for (let x = (y / 4) % 2 ? 74 : 78; x < 118; x += 8) R(g, x, y, 1, 4, '#9c3d2a');
    for (let y = 21; y < 64; y += 4) R(g, 74, y, 44, 1, '#9c3d2a');
    R(g, 82, 32, 28, 32, '#2a1510'); R(g, 84, 30, 24, 2, '#9c3d2a');
    R(g, 86, 58, 20, 4, '#6b3e22'); R(g, 88, 56, 16, 3, '#7a4a2a');
    R(g, 68, 62, 56, 4, '#b8b0a4');
    // Rafta mumlar ve vazo
    R(g, 76, 4, 3, 6, '#fff3dc'); R(g, 81, 6, 3, 4, '#fff3dc'); R(g, 108, 4, 6, 6, '#e8d8c2'); R(g, 110, 0, 1, 4, '#d8c39b'); R(g, 112, 1, 1, 3, '#d8c39b');
    // Koyun postu
    R(g, 74, 78, 44, 12, '#fffaf0'); R(g, 72, 80, 48, 8, '#fffaf0'); R(g, 76, 82, 40, 1, '#ece4d4');
    // Odun sepeti
    R(g, 54, 58, 14, 10, '#c9a36b'); R(g, 55, 54, 3, 5, '#7a4a2a'); R(g, 59, 53, 3, 6, '#8a5a36'); R(g, 63, 54, 3, 5, '#7a4a2a');
    sideDoor(g, 'right', '#1f7a7a');
  },
  dyn(g, { st, t }) {
    if (!st.fire) return;
    const f = Math.sin(t * 12) * 1.5;
    R(g, 88, 46 - f, 16, 12 + f, '#ff6a2c'); R(g, 91, 42 - f, 10, 16 + f, '#ffa53c'); R(g, 94, 46 - f * 1.5, 4, 10, '#fff1a0');
    R(g, 77, 2 + (Math.sin(t * 9) > 0 ? 1 : 0), 1, 2, '#ffd27a'); R(g, 82, 4, 1, 2, '#ffd27a');
  },
  props: [
    { y: 88, draw(g) { // berjer
      R(g, 150, 60, 26, 14, '#ffc93c'); R(g, 152, 62, 22, 10, '#ffd75e'); R(g, 148, 70, 6, 16, '#e0a92a'); R(g, 172, 70, 6, 16, '#e0a92a');
      R(g, 152, 74, 22, 8, '#ffd75e'); R(g, 152, 82, 22, 4, '#e0a92a'); R(g, 150, 86, 2, 3, C.woodD); R(g, 174, 86, 2, 3, C.woodD);
      R(g, 166, 62, 8, 18, '#fff3dc'); R(g, 168, 62, 1, 18, '#ecd8b8');
    } },
    { y: 128, draw(g) { plant(g, 30, 128, true); } },
  ],
  blocks: [[0, 0, W, 54], [0, 54, 34, 12], [52, 52, 18, 18], [68, 54, 56, 14], [146, 70, 34, 20], [20, 118, 20, 12]],
  doors: [{ x: 182, y: 84, w: 6, h: 26, to: 'salon', spawn: { x: 16, y: 96, dir: 'right' } }],
  spots: [
    { id: 'fire', x: 96, y: 74, hit: [70, 10, 52, 58], label: (st) => (st.fire ? 'Ateşi söndür' : 'Ateşi yak') },
    { id: 'armchair', x: 162, y: 94, hit: [146, 58, 34, 32], label: () => 'Otur' },
    { id: 'clock', x: 133, y: 60, hit: [122, 12, 22, 20], label: () => 'Saate bak' },
  ],
  seats: [{ x: 163, y: 80 }],
  lights: ({ st, t }) => [
    st.fire && { x: 96, y: 52, r: 82 + Math.sin(t * 7) * 3, a: 0.95, color: '255,140,60' },
    { x: 80, y: 6, r: 26, a: 0.6, color: '255,200,120' },
  ],
});

/** Balkon: açık hava, gökyüzü (saate göre, iki şehir), şehir silueti, bank, ışık zinciri. Sol kapı → salon. */
const balkon = makeScene({
  id: 'balkon',
  name: 'Balkon',
  draw(g) {
    // Gökyüzü ve şehir canlı çizilir; burada korkuluk ve zemin
    tileFloor(g, 66, '#e88a5c', '#d9784f');
    R(g, 0, 58, W, 3, '#fff3dc'); R(g, 0, 61, W, 1, '#e6cfa6');
    for (let x = 2; x < W; x += 8) R(g, x, 61, 2, 9, '#fff3dc');
    R(g, 0, 68, W, 2, '#e6cfa6');
    // Korkuluk saksıları
    R(g, 20, 52, 28, 6, '#b8552f'); for (let i = 0; i < 6; i++) R(g, 22 + i * 4, 46 - (i % 2) * 2, 3, 6, ['#ff5d8f', '#ffc93c', '#fff3dc'][i % 3]);
    R(g, 144, 52, 28, 6, '#b8552f'); for (let i = 0; i < 6; i++) R(g, 146 + i * 4, 46 - (i % 2) * 2, 3, 6, ['#5b8def', '#ff7a59', '#fff3dc'][i % 3]);
    // Bank (karşıya bakan)
    R(g, 68, 70, 56, 4, '#a8683c'); R(g, 68, 75, 56, 4, '#a8683c'); R(g, 68, 70, 56, 1, '#c98a55');
    R(g, 66, 80, 60, 8, '#c98a55'); R(g, 66, 80, 60, 2, '#e0a870'); R(g, 68, 88, 3, 6, '#5a3a22'); R(g, 121, 88, 3, 6, '#5a3a22');
    R(g, 76, 76, 10, 8, '#ff7a59'); R(g, 106, 76, 10, 8, '#3fb7a4');
    // Sol kapı (cam)
    R(g, 0, 72, 5, 44, '#fff3dc'); R(g, 0, 74, 3, 40, '#9ad0ff');
    R(g, 5, 92, 12, 10, '#c9a36b');
  },
  dyn(g, { hour, partnerHour, t, st }) {
    // İki saat dilimi farklıysa gökyüzü ikiye bölünür: sol senin, sağ partnerinin gökyüzü
    const split = partnerHour !== null && Math.abs(((partnerHour - hour + 36) % 24) - 12) < 10;
    if (split) { drawSky(g, 0, 0, W / 2, 58, hour, t); drawSky(g, W / 2, 0, W / 2, 58, partnerHour, t); R(g, W / 2, 0, 1, 58, 'rgba(255,255,255,0.35)'); }
    else drawSky(g, 0, 0, W, 58, hour, t);
    const night = skyColors(hour)[2];
    const blds = [[0, 30, 18], [16, 24, 14], [30, 34, 20], [52, 20, 12], [64, 28, 18], [84, 18, 14], [100, 26, 20], [122, 22, 12], [134, 32, 18], [154, 24, 16], [172, 30, 20]];
    for (const [x, y, w] of blds) {
      R(g, x, y + 4, w, 58 - y - 4, night ? '#23264a' : '#7aa0c8');
      if (night) for (let wy = y + 8; wy < 54; wy += 6) for (let wx = x + 2; wx < x + w - 2; wx += 5) if ((wx * 7 + wy) % 3) R(g, wx, wy, 2, 2, '#ffd27a');
    }
    R(g, 0, 58, W, 3, '#fff3dc');
    for (let x = 2; x < W; x += 8) R(g, x, 61, 2, 9, '#fff3dc');
    // Işık zinciri
    for (let i = 0; i < 16; i++) {
      const x = 6 + i * 12, y = 8 + Math.round(Math.sin((i / 15) * Math.PI * 2) * 2) + 2;
      R(g, x, y - 2, 1, 2, '#3a3330');
      R(g, x - 1, y, 3, 3, st.lights ? ((Math.sin(t * 2 + i) + 1) / 2 > 0.2 ? '#ffd27a' : '#ffb347') : '#8a7a60');
    }
  },
  props: [
    { y: 112, draw(g) { R(g, 140, 98, 18, 3, '#fff3dc'); R(g, 148, 101, 2, 10, '#3a3330'); R(g, 144, 110, 10, 2, '#3a3330'); R(g, 146, 94, 3, 4, '#fff3dc'); R(g, 147, 92, 1, 2, '#ffd27a'); } },
    { y: 134, draw(g) { plant(g, 176, 134, true); } },
    { y: 132, draw(g) { plant(g, 28, 132, false); } },
  ],
  blocks: [[0, 0, W, 72], [64, 68, 64, 22], [138, 96, 22, 16], [166, 124, 20, 10], [20, 122, 18, 10]],
  doors: [{ x: 4, y: 84, w: 6, h: 28, to: 'salon', spawn: { x: 176, y: 96, dir: 'left' } }],
  spots: [
    { id: 'bench', x: 96, y: 96, hit: [64, 66, 64, 26], label: () => 'Otur' },
    { id: 'sky', x: 60, y: 76, hit: [0, 0, W, 56], label: () => 'Gökyüzüne bak' },
    { id: 'lights', x: 140, y: 78, hit: [0, 4, W, 12], label: (st) => (st.lights ? 'Işıkları söndür' : 'Işıkları yak') },
  ],
  seats: [{ x: 84, y: 84 }, { x: 108, y: 84 }],
  lights: ({ st }) => [
    st.lights && { x: 96, y: 14, r: 120, a: 0.75, color: '255,200,110' },
    { x: 148, y: 92, r: 24, a: 0.7, color: '255,190,100' },
  ],
  outdoor: true,
});

/** Hobi köşesi: gardırop (karakter), şövale, fotoğraf kabini, çalışma masası. Alt kapı → salon. */
const hobi = makeScene({
  id: 'hobi',
  name: 'Hobi köşesi',
  draw(g) {
    wallpaper(g, '#8fe0c8', '#b4ecdb', 'stripes');
    wainscot(g, '#ffd75e', '#e0a92a');
    woodFloor(g, '#e0b07a', '#ebbe8a', '#c08a52');
    // Duvarda bayrak süsü
    for (let i = 0; i < 12; i++) { const x = 50 + i * 8; R(g, x, 6 + (i % 2), 6, 2, '#3a3330'); R(g, x + 1, 8 + (i % 2), 4, 4, ['#ff7a59', '#ffc93c', '#5b8def', '#ff5d8f'][i % 4]); }
    // Gardırop
    R(g, 6, 12, 34, 52, C.woodD); R(g, 8, 14, 15, 48, '#c98a55'); R(g, 24, 14, 14, 48, '#c98a55'); R(g, 21, 34, 2, 6, C.gold); R(g, 25, 34, 2, 6, C.gold);
    R(g, 10, 18, 11, 18, '#b47744'); R(g, 26, 18, 10, 18, '#b47744');
    // Şövale
    R(g, 62, 26, 2, 38, '#7a4426'); R(g, 76, 26, 2, 38, '#7a4426'); R(g, 58, 30, 24, 20, '#fffaf0'); R(g, 60, 32, 20, 16, '#ffffff');
    R(g, 66, 36, 3, 3, '#ff5d8f'); R(g, 71, 36, 3, 3, '#ff5d8f'); R(g, 65, 38, 10, 3, '#ff5d8f'); R(g, 67, 41, 6, 2, '#ff5d8f'); R(g, 69, 43, 2, 1, '#ff5d8f');
    R(g, 58, 50, 24, 2, '#7a4426');
    // Çalışma masası
    R(g, 92, 44, 40, 4, C.wood); R(g, 92, 44, 40, 1, C.woodL); R(g, 94, 48, 2, 14, C.woodD); R(g, 128, 48, 2, 14, C.woodD);
    R(g, 98, 38, 10, 6, '#2e2e3a'); R(g, 99, 39, 8, 4, '#5ec2ff'); R(g, 112, 40, 6, 4, '#fff3dc'); R(g, 120, 36, 6, 8, C.pot); R(g, 119, 31, 8, 6, C.leaf);
    // Fotoğraf kabini
    R(g, 142, 6, 44, 60, '#e0473f'); R(g, 144, 10, 40, 4, '#ffc93c'); R(g, 150, 4, 28, 6, '#fff3dc');
    R(g, 146, 16, 18, 48, '#c43838'); for (let y = 18; y < 64; y += 4) R(g, 146, y, 18, 1, '#a82e2e');
    R(g, 166, 16, 16, 48, '#2a1a18'); R(g, 170, 24, 8, 10, '#ffffff'); R(g, 171, 25, 6, 8, '#ffd27a');
    // Yuvarlak halı
    R(g, 66, 92, 60, 26, '#ff5d8f'); R(g, 62, 96, 68, 18, '#ff5d8f'); R(g, 70, 96, 52, 18, '#ffc93c'); R(g, 76, 100, 40, 10, '#ff7a59');
    // Alt kapı (salona)
    R(g, 82, 138, 28, 6, '#c9a36b'); R(g, 80, 140, 32, 4, C.woodD);
  },
  dyn(g, { st }) { R(g, 106, 30, 6, 4, st.desk ? '#ffe08a' : '#d6c08f'); R(g, 108, 34, 2, 10, C.metal); },
  props: [{ y: 130, draw(g) { plant(g, 176, 130, true); } }, { y: 128, draw(g) { plant(g, 18, 128, false); } }],
  blocks: [[0, 0, W, 54], [4, 54, 38, 12], [56, 54, 28, 12], [90, 54, 44, 10], [140, 54, 48, 14], [166, 120, 20, 12], [8, 118, 20, 12]],
  doors: [{ x: 82, y: 134, w: 28, h: 6, to: 'salon', spawn: { x: 171, y: 64, dir: 'down' } }],
  spots: [
    { id: 'wardrobe', x: 24, y: 70, hit: [4, 10, 38, 56], label: () => 'Karakterini değiştir' },
    { id: 'desk', x: 112, y: 68, hit: [90, 28, 44, 36], label: (st) => (st.desk ? 'Masa lambasını söndür' : 'Masa lambasını yak') },
    { id: 'easel', x: 70, y: 70, hit: [56, 24, 28, 42], label: () => 'Resme bak' },
    { id: 'booth', x: 160, y: 72, hit: [140, 4, 48, 64], label: () => 'Fotoğraf kabini' },
  ],
  seats: [],
  lights: ({ st }) => [st.desk && { x: 109, y: 36, r: 52, a: 0.9, color: '255,200,120' }, { x: 174, y: 30, r: 30, a: 0.7, color: '255,220,150' }],
});

export const SCENES = { salon, somine, balkon, hobi };
export const DEFAULT_STATE = { lamp: true, tv: false, fire: true, lights: true, desk: true };
