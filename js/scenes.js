// Dört sahne: Salon (merkez), Şömine odası (sol kapı), Balkon (sağ kapı), Hobi köşesi (arka kapı).
// Her sahne: statik arka plan (boyaya göre yeniden çizilir), canlı parçalar, y'ye göre sıralanan ön plan eşyaları,
// çarpışma kutuları, kapılar, etkileşim noktaları, oturma yerleri, foto çerçeveleri ve ışık kaynakları.
// Taşınabilir eşyaların kaydırması, yerleştirilen dekor ve oda boyası DECOR'da tutulur (ikinize ortak).
import { R, shade } from './art.js';
import { C, CATALOG, plant } from './decor.js';

export const W = 192, H = 144, WALL = 50;

/** Ortak dekor/eşya durumu: main.js veritabanından doldurur, sahneler buradan çizer. */
export const DECOR = {
  v: 0, // her değişiklikte artar (yerleşim önbelleği yenilenir)
  paint: {}, // sahne → {wall, accent, floor, motif}
  moved: {}, // sahne → eşya → {dx, dy}
  items: {}, // sahne → anahtar → {type, x, y}
  frames: {}, // çerçeve → piksel fotoğraf (canvas)
  drawing: null, // şövaledeki resmin küçük hali (canvas)
  music: false, // pikap dönüyor mu
  tvOn: false, // TV'de film/ekran var mı
  flower: { stage: 0, wilt: false },
  pet: { species: 'cat', color: '#1f1c24', acc: 'none', food: 80, love: 80, play: 80, clean: 80 }, // varsayılan: siyah kedi Pascal
};
export const bump = () => DECOR.v++;

// ---------- Ortak çizim parçaları ----------
function wallpaper(g, base, accent, motif) {
  R(g, 0, 0, W, WALL, base);
  if (motif === 'diamond') for (let y = 8; y < WALL - 10; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) { R(g, x + 3, y, 2, 1, accent); R(g, x + 2, y + 1, 4, 1, accent); R(g, x + 3, y + 2, 2, 1, accent); }
  if (motif === 'dots') for (let y = 6; y < WALL - 10; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < W; x += 6) R(g, x + 1, y, 1, 1, accent);
  if (motif === 'stripes') for (let x = 0; x < W; x += 10) R(g, x, 0, 4, WALL, accent);
  if (motif === 'hearts') for (let y = 8; y < WALL - 12; y += 10) for (let x = (y / 10) % 2 ? 6 : 0; x < W; x += 12) { R(g, x, y, 2, 2, accent); R(g, x + 3, y, 2, 2, accent); R(g, x, y + 1, 5, 2, accent); R(g, x + 1, y + 3, 3, 1, accent); R(g, x + 2, y + 4, 1, 1, accent); }
  R(g, 0, 0, W, 3, 'rgba(0,0,0,0.12)'); // tavan gölgesi
}
function wainscot(g, col, trim) {
  R(g, 0, WALL - 12, W, 12, col);
  for (let x = 4; x < W; x += 24) { R(g, x, WALL - 9, 18, 1, 'rgba(255,255,255,0.25)'); R(g, x, WALL - 9, 1, 6, 'rgba(255,255,255,0.25)'); R(g, x, WALL - 3, 18, 1, 'rgba(0,0,0,0.15)'); }
  R(g, 0, WALL - 13, W, 2, trim);
  R(g, 0, WALL - 2, W, 2, trim);
}
function woodFloor(g, c1) {
  const c2 = shade(c1, 0.08), line = shade(c1, -0.22);
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
/** Çerçeve: (x,y,w,h) dış ölçü; içi fotoğraf yoksa varsayılan resim. */
function frame(g, x, y, w, h, art) {
  R(g, x + 1, y + 1, w, h, 'rgba(0,0,0,0.2)');
  R(g, x, y, w, h, C.woodD); R(g, x + 1, y + 1, w - 2, h - 2, C.gold); R(g, x + 2, y + 2, w - 4, h - 4, C.cream);
  art(x + 3, y + 3, w - 6, h - 6);
}
/** Basit piksel çizgi (saat kolları). */
function line(g, x0, y0, x1, y1, col) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
  for (let i = 0; i <= n; i++) R(g, Math.round(x0 + ((x1 - x0) * i) / (n || 1)), Math.round(y0 + ((y1 - y0) * i) / (n || 1)), 1, 1, col);
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
  const sc = { ...def, bg };
  sc.rebuild = () => {
    const g = bg.getContext('2d');
    g.clearRect(0, 0, W, H);
    def.draw(g, { ...def.colors, ...DECOR.paint[def.id] });
  };
  sc.rebuild();
  return sc;
}
/** Oda boyası değişince arka planları yeniden çizer. */
export function repaint() { Object.values(SCENES).forEach((s) => s.rebuild()); bump(); }

/** Salon: duvarda TV, tam karşısında kanepe (sırtı bize dönük), pikap, lambader, soru kavanozu, kedi. */
const salon = makeScene({
  id: 'salon',
  name: 'Salon',
  colors: { wall: '#ff9a76', accent: '#ffb999', floor: '#c98a55', motif: 'diamond' },
  draw(g, col) {
    wallpaper(g, col.wall, col.accent, col.motif);
    wainscot(g, '#fff0dc', '#d9784f');
    woodFloor(g, col.floor);
    // Pencere (gökyüzü canlı çizilir) ve perdeler
    R(g, 6, 6, 28, 28, C.woodD); R(g, 8, 8, 24, 24, '#5ec2ff');
    R(g, 2, 4, 7, 34, C.cream); R(g, 31, 4, 7, 34, C.cream); R(g, 4, 4, 1, 34, '#e6cfa6'); R(g, 34, 4, 1, 34, '#e6cfa6');
    R(g, 0, 2, 40, 2, C.metal); R(g, 6, 33, 28, 3, C.woodL);
    // Duvardaki TV + hoparlörler
    R(g, 70, 10, 52, 32, '#16141a'); R(g, 71, 11, 50, 30, '#26242c'); R(g, 94, 42, 4, 2, C.metal);
    R(g, 63, 30, 5, 14, '#26242c'); R(g, 64, 32, 3, 3, '#4a4752'); R(g, 64, 37, 3, 5, '#4a4752');
    R(g, 124, 30, 5, 14, '#26242c'); R(g, 125, 32, 3, 3, '#4a4752'); R(g, 125, 37, 3, 5, '#4a4752');
    // TV ünitesi
    R(g, 60, 44, 72, 12, C.wood); R(g, 60, 44, 72, 2, C.woodL); R(g, 64, 48, 20, 6, C.woodD); R(g, 86, 48, 20, 6, C.woodD); R(g, 108, 48, 20, 6, C.woodD);
    R(g, 62, 56, 2, 2, C.woodD); R(g, 128, 56, 2, 2, C.woodD);
    // Pikap dolabı + plaklar
    R(g, 134, 42, 22, 14, C.woodD); R(g, 135, 43, 20, 2, C.woodL); R(g, 136, 46, 18, 8, '#5a3420');
    for (let i = 0; i < 5; i++) R(g, 137 + i * 3, 47, 2, 6, ['#ff5d8f', '#ffc93c', '#5b8def', '#fff3dc', '#3fb7a4'][i]);
    R(g, 135, 56, 2, 2, C.woodD); R(g, 153, 56, 2, 2, C.woodD);
    // Arka kapı (hobi köşesine)
    R(g, 158, 14, 26, 38, C.woodD); R(g, 160, 16, 22, 36, '#c98a55'); R(g, 162, 18, 18, 14, '#b47744'); R(g, 162, 34, 18, 16, '#b47744'); R(g, 177, 33, 2, 2, C.gold);
    R(g, 160, 52, 22, 4, '#c9a36b');
    // Kilim (TV ile kanepe arası)
    rug(g, 56, 64, 80, 28, '#e0473f', '#ffb547', '#2f5d8f', '#fff3dc');
    // Kanepenin oturma minderleri (sırt arkadan, ön planda çizilir)
    const s1 = '#2f9e8f', s2 = '#3fb7a4', s3 = '#6fd6c5';
    R(g, 56, 98, 80, 14, s1); R(g, 58, 99, 37, 11, s2); R(g, 97, 99, 37, 11, s2); R(g, 58, 99, 76, 2, s3);
    sideDoor(g, 'left', col.wall); sideDoor(g, 'right', col.wall);
  },
  dyn(g, { st, hour, t }) {
    drawSky(g, 8, 8, 24, 24, hour, t);
    R(g, 19, 8, 2, 24, C.woodD); R(g, 8, 19, 24, 2, C.woodD);
    // TV ekranı (film açıksa üstünde gerçek görüntü oynar)
    if (DECOR.tvOn) R(g, 73, 13, 46, 26, '#000');
    else if (st.tv) {
      const k = (t * 2 | 0) % 3;
      R(g, 73, 13, 46, 26, ['#7ab8ff', '#9ad0ff', '#86c4ff'][k]); R(g, 73, 31, 46, 8, '#4fbf6a');
      R(g, 80 + k * 4, 18, 8, 8, '#fff1c8'); R(g, 106, 20 - k, 5, 5, '#ffffff');
    } else { R(g, 73, 13, 46, 26, '#121016'); R(g, 74, 14, 12, 1, '#3a3842'); R(g, 74, 15, 6, 1, '#3a3842'); }
    // Pikap
    R(g, 136, 36, 18, 6, '#3a2418'); R(g, 136, 36, 18, 1, '#5a3a28');
    const spin = DECOR.music ? (t * 6 | 0) % 2 : 0;
    R(g, 138, 35, 11, 4, '#16141a'); R(g, 142, 36, 3, 2, spin ? '#ff5d8f' : '#ffc93c'); R(g, 151, 33, 1, 5, '#d8d0c0'); R(g, 148, 33, 3, 1, '#d8d0c0');
    if (DECOR.music) for (let i = 0; i < 3; i++) {
      const p = (t * 0.6 + i / 3) % 1, nx = 142 + Math.sin(p * 6 + i) * 6, ny = 32 - p * 22;
      R(g, nx, ny, 2, 2, ['#ffd27a', '#ff7aa3', '#8fd0ff'][i]); R(g, nx + 1, ny - 3, 1, 3, ['#ffd27a', '#ff7aa3', '#8fd0ff'][i]);
    }
    // Mama kabı
    R(g, 40, 64, 10, 4, '#5b8def'); R(g, 40, 64, 10, 1, '#8fb0ff');
    if (DECOR.pet.food > 25) R(g, 41, 63, 8, 2, '#c8742c');
  },
  props: [
    { id: 'sofa', y: 132, draw(g) { // kanepe sırtı ve kolçaklar (oturanların önünde)
      const s1 = '#2f9e8f', s2 = '#3fb7a4', s3 = '#6fd6c5';
      R(g, 52, 98, 9, 28, s1); R(g, 131, 98, 9, 28, s1); R(g, 52, 98, 9, 2, s3); R(g, 131, 98, 9, 2, s3);
      R(g, 58, 111, 76, 15, s2); R(g, 58, 111, 76, 2, s3); R(g, 95, 113, 2, 12, s1);
      for (let x = 66; x < 130; x += 10) R(g, x, 118, 2, 2, s1);
      R(g, 54, 126, 3, 3, C.woodD); R(g, 135, 126, 3, 3, C.woodD);
    } },
    { id: 'lamp', movable: true, y: 120, hit: [20, 68, 20, 54], block: [22, 114, 16, 6], draw(g, { st }) {
      R(g, 29, 78, 2, 40, C.metal); R(g, 24, 117, 12, 3, C.metal); R(g, 23, 70, 14, 9, st.lamp ? '#ffe08a' : '#d6c08f'); R(g, 24, 70, 12, 1, '#fff6c8');
    } },
    { id: 'jartable', movable: true, y: 118, hit: [140, 88, 24, 32], block: [143, 112, 18, 6], draw(g) {
      R(g, 144, 104, 16, 3, C.wood); R(g, 144, 104, 16, 1, C.woodL); R(g, 146, 107, 2, 11, C.woodD); R(g, 156, 107, 2, 11, C.woodD);
      R(g, 147, 94, 10, 10, '#bfe6f2'); R(g, 148, 95, 8, 8, '#d8f2fa');
      R(g, 149, 99, 2, 2, '#ff7aa3'); R(g, 152, 100, 2, 2, '#ffc93c'); R(g, 150, 101, 3, 2, '#8fd0ff'); R(g, 153, 97, 2, 2, '#9ee6a8');
      R(g, 146, 92, 12, 2, '#e0473f'); R(g, 148, 90, 8, 2, '#ff6a5a');
    } },
    { id: 'plantL', movable: true, y: 134, hit: [4, 100, 18, 36], block: [6, 128, 14, 6], draw(g) { plant(g, 13, 134, true); } },
    { id: 'plantR', movable: true, y: 136, hit: [170, 102, 20, 36], block: [172, 130, 14, 6], draw(g) { plant(g, 180, 136, true); } },
  ],
  blocks: [[0, 0, W, 54], [58, 42, 76, 16], [132, 40, 26, 18], [50, 96, 92, 32]],
  doors: [
    { x: 4, y: 84, w: 6, h: 26, to: 'somine', spawn: { x: 176, y: 96, dir: 'left' } },
    { x: 182, y: 84, w: 6, h: 26, to: 'balkon', spawn: { x: 16, y: 100, dir: 'right' } },
    { x: 160, y: 55, w: 22, h: 5, to: 'hobi', spawn: { x: 96, y: 126, dir: 'up' } },
  ],
  spots: [
    { id: 'sit', group: 'sofa', x: 96, y: 92, hit: [50, 96, 92, 32], label: () => 'Kanepeye otur' },
    { id: 'tv', x: 96, y: 64, hit: [60, 8, 72, 50], label: () => 'TV · film izle' },
    { id: 'music', x: 145, y: 64, hit: [132, 28, 26, 30], label: () => (DECOR.music ? 'Pikap · çalıyor' : 'Pikap · müzik aç') },
    { id: 'lamp', prop: 'lamp', x: 30, y: 126, hit: [20, 68, 20, 54], label: (st) => (st.lamp ? 'Lambayı söndür' : 'Lambayı yak') },
    { id: 'jar', prop: 'jartable', x: 152, y: 124, hit: [140, 88, 24, 32], label: () => 'Soru kavanozu' },
    { id: 'bowl', x: 45, y: 74, hit: [36, 60, 18, 12], label: () => 'Mama koy' },
    { id: 'cat', dynamic: true, label: () => 'Evcil dostumuz' },
  ],
  seats: [{ x: 84, y: 116, pose: 'back', group: 'sofa' }, { x: 108, y: 116, pose: 'back', group: 'sofa' }],
  frames: [{ id: 'salon1', x: 43, y: 13, w: 16, h: 12, outer: [40, 10, 22, 18] }],
  frameArt: { salon1: (g, x, y, w, h) => { R(g, x, y, w, h, '#ffd27a'); R(g, x, y + h - 3, w, 3, '#3fb7a4'); R(g, x + 5, y + 2, 4, 4, '#ff7a59'); } },
  lights: ({ st, t }) => [
    st.lamp && { x: 30, y: 74, r: 72, a: 0.95, color: '255,190,100', prop: 'lamp' },
    (st.tv || DECOR.tvOn) && { x: 96, y: 28, r: 64 + Math.sin(t * 9) * 2, a: 0.9, color: '120,170,255' },
    { x: 20, y: 20, r: 30, a: 0.5, color: '200,220,255' },
    DECOR.music && { x: 145, y: 36, r: 22, a: 0.5, color: '255,150,200' },
  ],
  hasCat: true,
  catArea: [20, 64, 150, 30],
});

/** Şömine odası: tuğla şömine, foto tabloları, kitaplık (günlük), berjer, ilişki saati. Sağ kapı → salon. */
const somine = makeScene({
  id: 'somine',
  name: 'Şömine odası',
  colors: { wall: '#1f7a7a', accent: '#2f9a95', floor: '#8a4f2c', motif: 'dots' },
  draw(g, col) {
    wallpaper(g, col.wall, col.accent, col.motif);
    wainscot(g, shade(col.wall, -0.25), '#e0b25a');
    woodFloor(g, col.floor);
    // İlişki saati (kolları canlı çizilir)
    R(g, 125, 14, 16, 16, '#e0b25a'); R(g, 127, 16, 12, 12, '#fff3dc'); R(g, 132, 16, 2, 1, '#e0473f');
    R(g, 131, 30, 4, 6, '#e0b25a'); R(g, 132, 35, 2, 3, '#ff5d8f');
    // Kitaplık (sol) ve günlük
    R(g, 2, 18, 30, 46, C.woodD); R(g, 4, 20, 26, 42, '#3a2418');
    const books = ['#ff7a59', '#ffc93c', '#5b8def', '#4fbf6a', '#ff5d8f', '#fff3dc'];
    for (let s = 0; s < 3; s++) { for (let i = 0; i < 6; i++) R(g, 5 + i * 4, 22 + s * 14 + (i % 2), 3, 11 - (i % 2), books[(i + s) % 6]); R(g, 4, 33 + s * 14, 26, 2, C.wood); }
    R(g, 12, 47, 6, 9, '#ff5d8f'); R(g, 12, 47, 6, 1, '#ffa3c0'); R(g, 14, 50, 2, 2, '#ffc93c'); // günlük
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
    sideDoor(g, 'right', col.wall);
    sideDoor(g, 'left', col.wall); // yatak odasına (100 saat birlikte geçirince açılır)
  },
  dyn(g, { st, t, hour }) {
    // Saat: gerçek saat
    const a = ((hour % 12) / 12) * Math.PI * 2, m = ((hour % 1) * Math.PI * 2);
    R(g, 128, 17, 10, 10, '#fff3dc');
    line(g, 133, 22, 133 + Math.sin(m) * 5, 22 - Math.cos(m) * 5, '#3a2418');
    line(g, 133, 22, 133 + Math.sin(a) * 3, 22 - Math.cos(a) * 3, '#e0473f');
    R(g, 131 + Math.round(Math.sin(t * 2) * 1.5), 35, 2, 3, '#ff5d8f'); // sarkaç
    if (!st.fire) return;
    const f = Math.sin(t * 12) * 1.5;
    R(g, 88, 46 - f, 16, 12 + f, '#ff6a2c'); R(g, 91, 42 - f, 10, 16 + f, '#ffa53c'); R(g, 94, 46 - f * 1.5, 4, 10, '#fff1a0');
    R(g, 77, 2 + (Math.sin(t * 9) > 0 ? 1 : 0), 1, 2, '#ffd27a'); R(g, 82, 4, 1, 2, '#ffd27a');
  },
  props: [
    { id: 'armchair', movable: true, y: 88, hit: [146, 58, 34, 32], block: [146, 70, 34, 20], draw(g) {
      R(g, 150, 60, 26, 14, '#ffc93c'); R(g, 152, 62, 22, 10, '#ffd75e'); R(g, 148, 70, 6, 16, '#e0a92a'); R(g, 172, 70, 6, 16, '#e0a92a');
      R(g, 152, 74, 22, 8, '#ffd75e'); R(g, 152, 82, 22, 4, '#e0a92a'); R(g, 150, 86, 2, 3, C.woodD); R(g, 174, 86, 2, 3, C.woodD);
      R(g, 166, 62, 8, 18, '#fff3dc'); R(g, 168, 62, 1, 18, '#ecd8b8');
    } },
    { id: 'plant', movable: true, y: 128, hit: [18, 94, 24, 36], block: [20, 122, 20, 6], draw(g) { plant(g, 30, 128, true); } },
  ],
  blocks: [[0, 0, W, 54], [0, 54, 34, 12], [52, 52, 18, 18], [68, 54, 56, 14]],
  doors: [
    { x: 182, y: 84, w: 6, h: 26, to: 'salon', spawn: { x: 16, y: 96, dir: 'right' } },
    { x: 4, y: 84, w: 6, h: 26, to: 'yatak', spawn: { x: 176, y: 100, dir: 'left' } },
  ],
  spots: [
    { id: 'fire', x: 96, y: 74, hit: [70, 10, 52, 58], label: (st) => (st.fire ? 'Ateşi söndür' : 'Ateşi yak') },
    { id: 'sit', group: 'armchair', prop: 'armchair', x: 162, y: 94, hit: [146, 58, 34, 32], label: () => 'Berjere otur' },
    { id: 'clock', x: 133, y: 60, hit: [122, 12, 22, 28], label: () => 'İlişki saatimiz' },
    { id: 'diary', x: 17, y: 72, hit: [2, 16, 30, 50], label: () => 'Günlüğümüz' },
  ],
  seats: [{ x: 163, y: 80, group: 'armchair', prop: 'armchair' }],
  frames: [
    { id: 'somine1', x: 41, y: 15, w: 20, h: 14, outer: [38, 12, 26, 20] },
    { id: 'somine2', x: 151, y: 13, w: 18, h: 16, outer: [148, 10, 24, 22] },
  ],
  frameArt: {
    somine1: (g, x, y, w, h) => { R(g, x, y, w, h, '#ffb070'); R(g, x, y + h - 5, w, 5, '#b5543a'); R(g, x + w - 7, y + 2, 4, 4, '#fff1a8'); },
    somine2: (g, x, y, w, h) => { R(g, x, y, w, h, '#f6efe0'); R(g, x + w / 2 - 1, y + 2, 2, h - 4, '#6b5440'); R(g, x + 2, y + 4, 5, 3, '#4fbf6a'); R(g, x + w - 7, y + 7, 5, 3, '#2e8a4e'); },
  },
  lights: ({ st, t }) => [
    st.fire && { x: 96, y: 52, r: 82 + Math.sin(t * 7) * 3, a: 0.95, color: '255,140,60' },
    { x: 80, y: 6, r: 26, a: 0.6, color: '255,200,120' },
  ],
});

/** Bilardo masası (balkon ve admin odası aynı çizimi kullanır); (x, y) sol üst köşe. */
function poolTable(g, x, y) {
  R(g, x, y + 2, 50, 18, '#6b3e22'); R(g, x + 2, y + 4, 46, 14, '#2f8f5a'); R(g, x + 3, y + 5, 44, 12, '#3fa86a');
  for (const [px, py] of [[2, 4], [24, 4], [46, 4], [2, 16], [24, 16], [46, 16]]) R(g, x + px, y + py, 2, 2, '#1a1210');
  R(g, x + 10, y + 10, 2, 2, '#ffffff'); R(g, x + 34, y + 8, 2, 2, '#ffc93c'); R(g, x + 36, y + 11, 2, 2, '#e0473f'); R(g, x + 34, y + 13, 2, 2, '#5b8def');
  R(g, x + 7, y, 30, 1, '#e0b25a'); // isteka
  R(g, x + 2, y + 20, 3, 4, C.woodD); R(g, x + 45, y + 20, 3, 4, C.woodD);
}

/** Balkon: gökyüzü (iki saat dilimi), şehir, bank, ışık zinciri, langırt masası, bizim çiçeğimiz. */
const balkon = makeScene({
  id: 'balkon',
  name: 'Balkon',
  colors: { floor: '#e88a5c', accent: '#d9784f' },
  draw(g, col) {
    tileFloor(g, 66, col.floor, col.accent);
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
    R(g, 20, 52, 28, 6, '#b8552f'); for (let i = 0; i < 6; i++) R(g, 22 + i * 4, 46 - (i % 2) * 2, 3, 6, ['#ff5d8f', '#ffc93c', '#fff3dc'][i % 3]);
    R(g, 144, 52, 28, 6, '#b8552f'); for (let i = 0; i < 6; i++) R(g, 146 + i * 4, 46 - (i % 2) * 2, 3, 6, ['#5b8def', '#ff7a59', '#fff3dc'][i % 3]);
    // Işık zinciri
    for (let i = 0; i < 16; i++) {
      const x = 6 + i * 12, y = 8 + Math.round(Math.sin((i / 15) * Math.PI * 2) * 2) + 2;
      R(g, x, y - 2, 1, 2, '#3a3330');
      R(g, x - 1, y, 3, 3, st.lights ? ((Math.sin(t * 2 + i) + 1) / 2 > 0.2 ? '#ffd27a' : '#ffb347') : '#8a7a60');
    }
  },
  props: [
    { id: 'candle', movable: true, y: 112, hit: [136, 88, 26, 26], block: [138, 104, 22, 8], draw(g) { R(g, 140, 98, 18, 3, '#fff3dc'); R(g, 148, 101, 2, 10, '#3a3330'); R(g, 144, 110, 10, 2, '#3a3330'); R(g, 146, 94, 3, 4, '#fff3dc'); R(g, 147, 92, 1, 2, '#ffd27a'); } },
    { id: 'foos', movable: true, y: 116, hit: [12, 90, 48, 28], block: [14, 102, 44, 14], draw(g) { // langırt
      R(g, 14, 96, 44, 16, '#7a4426'); R(g, 16, 98, 40, 11, '#3fae5a'); R(g, 16, 98, 40, 1, '#6fd07f');
      R(g, 35, 98, 1, 11, '#d8f5d8'); R(g, 16, 101, 2, 5, '#fff3dc'); R(g, 54, 101, 2, 5, '#fff3dc');
      [22, 30, 42, 50].forEach((x, i) => { R(g, x, 95, 1, 18, '#c8ccd4'); R(g, x - 1, 100 + (i % 2) * 3, 3, 3, i < 2 ? '#e0473f' : '#5b8def'); });
      R(g, 35, 103, 2, 2, '#ffffff');
      R(g, 16, 112, 3, 4, C.woodD); R(g, 53, 112, 3, 4, C.woodD);
    } },
    { id: 'pool', movable: true, y: 132, hit: [70, 104, 54, 30], block: [72, 114, 50, 18], draw(g) { poolTable(g, 72, 108); } },
    { id: 'flower', movable: true, y: 126, hit: [158, 92, 26, 36], block: [162, 120, 16, 6], draw(g, { t }) { drawFlower(g, 170, 126, t); } },
    { id: 'plant', movable: true, y: 134, hit: [180, 102, 12, 34], block: [178, 128, 12, 6], draw(g) { plant(g, 184, 134, false); } },
  ],
  blocks: [[0, 0, W, 72], [64, 68, 64, 22]],
  doors: [{ x: 4, y: 84, w: 6, h: 28, to: 'salon', spawn: { x: 176, y: 96, dir: 'left' } }],
  spots: [
    { id: 'sit', group: 'bench', x: 96, y: 96, hit: [64, 66, 64, 26], label: () => 'Banka otur' },
    { id: 'sky', x: 60, y: 78, hit: [0, 0, W, 56], label: () => 'Gökyüzüne bak' },
    { id: 'lights', x: 140, y: 78, hit: [0, 4, W, 12], label: (st) => (st.lights ? 'Işıkları söndür' : 'Işıkları yak') },
    { id: 'foos', prop: 'foos', x: 36, y: 124, hit: [12, 90, 48, 28], label: () => 'Langırt oyna' },
    { id: 'pool', prop: 'pool', x: 97, y: 104, hit: [70, 104, 54, 30], label: () => 'Bilardo oyna' },
    { id: 'flower', prop: 'flower', x: 156, y: 130, hit: [158, 92, 26, 36], label: () => 'Çiçeğimiz' },
  ],
  seats: [{ x: 84, y: 84, group: 'bench' }, { x: 108, y: 84, group: 'bench' }],
  lights: ({ st }) => [
    st.lights && { x: 96, y: 14, r: 120, a: 0.75, color: '255,200,110' },
    { x: 148, y: 92, r: 24, a: 0.7, color: '255,190,100', prop: 'candle' },
  ],
  outdoor: true,
});

/** Çiçek: 0 tohum, 1 filiz, 2 tomurcuk, 3 çiçek. Uzun süre sulanmazsa boynunu büker. */
function drawFlower(g, x, y, t) {
  const { stage, wilt } = DECOR.flower;
  R(g, x - 7, y - 10, 14, 10, '#ff7a59'); R(g, x - 7, y - 10, 14, 2, '#ffa07a'); R(g, x - 6, y - 2, 12, 2, '#d9583a');
  R(g, x - 3, y - 6, 2, 2, '#ffd27a'); R(g, x + 2, y - 5, 2, 2, '#ffd27a'); // kalpler
  R(g, x - 6, y - 11, 12, 2, '#6b3e22');
  const sway = Math.round(Math.sin(t * 1.5) * (wilt ? 0 : 1));
  if (stage === 0) { R(g, x - 1, y - 12, 2, 1, '#8a5a36'); return; }
  const top = y - 11 - [0, 8, 14, 20][stage];
  R(g, x, top, 1, y - 11 - top, '#2e8a4e');
  R(g, x - 4, top + 6, 4, 2, '#4fbf6a'); R(g, x + 1, top + 9, 4, 2, '#4fbf6a');
  const hx = x + sway + (wilt ? 3 : 0), hy = top + (wilt ? 3 : 0);
  if (stage === 1) R(g, hx - 1, hy - 2, 3, 2, '#6fd07f');
  if (stage === 2) { R(g, hx - 2, hy - 4, 5, 4, '#ff7aa3'); R(g, hx - 1, hy - 5, 3, 1, '#ffa3c0'); }
  if (stage === 3) {
    const pc = wilt ? '#b88aa0' : '#ff5d8f';
    R(g, hx - 4, hy - 4, 3, 3, pc); R(g, hx + 2, hy - 4, 3, 3, pc); R(g, hx - 4, hy + 1, 3, 3, pc); R(g, hx + 2, hy + 1, 3, 3, pc);
    R(g, hx - 1, hy - 6, 3, 3, pc); R(g, hx - 1, hy + 2, 3, 3, pc); R(g, hx - 1, hy - 2, 3, 3, '#ffd27a');
  }
}

/** Hobi köşesi: gardırop (karakter), şövale (birlikte çizim), fotoğraf kabini, çalışma masası, oyun masası. */
const hobi = makeScene({
  id: 'hobi',
  name: 'Hobi köşesi',
  colors: { wall: '#8fe0c8', accent: '#b4ecdb', floor: '#e0b07a', motif: 'stripes' },
  draw(g, col) {
    wallpaper(g, col.wall, col.accent, col.motif);
    wainscot(g, '#ffd75e', '#e0a92a');
    woodFloor(g, col.floor);
    // Duvarda bayrak süsü
    for (let i = 0; i < 12; i++) { const x = 50 + i * 8; R(g, x, 6 + (i % 2), 6, 2, '#3a3330'); R(g, x + 1, 8 + (i % 2), 4, 4, ['#ff7a59', '#ffc93c', '#5b8def', '#ff5d8f'][i % 4]); }
    // Gardırop + dekor dolabı
    R(g, 6, 12, 34, 52, C.woodD); R(g, 8, 14, 15, 48, '#c98a55'); R(g, 24, 14, 14, 48, '#c98a55'); R(g, 21, 34, 2, 6, C.gold); R(g, 25, 34, 2, 6, C.gold);
    R(g, 10, 18, 11, 18, '#b47744'); R(g, 26, 18, 10, 18, '#b47744');
    R(g, 10, 42, 11, 16, '#b47744'); R(g, 26, 42, 10, 16, '#b47744');
    // Şövale
    R(g, 62, 26, 2, 38, '#7a4426'); R(g, 76, 26, 2, 38, '#7a4426'); R(g, 58, 30, 24, 20, '#fffaf0'); R(g, 60, 32, 20, 16, '#ffffff');
    R(g, 58, 50, 24, 2, '#7a4426'); R(g, 84, 56, 6, 4, '#fff3dc'); R(g, 85, 55, 1, 1, '#ff5d8f'); R(g, 87, 55, 1, 1, '#5b8def'); R(g, 88, 56, 1, 1, '#ffc93c');
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
    sideDoor(g, 'right', col.wall); // mutfağa
  },
  dyn(g, { st }) {
    R(g, 106, 30, 6, 4, st.desk ? '#ffe08a' : '#d6c08f'); R(g, 108, 34, 2, 10, C.metal);
    if (DECOR.drawing) R(g, 60, 32, 20, 16, '#fffaf0');
    else { R(g, 66, 36, 3, 3, '#ff5d8f'); R(g, 71, 36, 3, 3, '#ff5d8f'); R(g, 65, 38, 10, 3, '#ff5d8f'); R(g, 67, 41, 6, 2, '#ff5d8f'); R(g, 69, 43, 2, 1, '#ff5d8f'); }
  },
  props: [
    { id: 'gametable', movable: true, y: 110, hit: [80, 90, 32, 22], block: [82, 102, 28, 8], draw(g) {
      R(g, 84, 98, 24, 6, C.wood); R(g, 84, 98, 24, 1, C.woodL);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) R(g, 88 + i * 3, 99 + j * 2, 2, 2, (i + j) % 2 ? '#fff3dc' : '#3a2418');
      R(g, 86, 104, 2, 6, C.woodD); R(g, 104, 104, 2, 6, C.woodD);
      R(g, 90, 95, 3, 3, '#e0473f'); R(g, 100, 95, 3, 3, '#5b8def');
    } },
    { id: 'plantR', movable: true, y: 130, hit: [166, 96, 22, 36], block: [168, 124, 16, 6], draw(g) { plant(g, 176, 130, true); } },
    { id: 'plantL', movable: true, y: 128, hit: [8, 102, 20, 28], block: [10, 122, 16, 6], draw(g) { plant(g, 18, 128, false); } },
  ],
  blocks: [[0, 0, W, 54], [4, 54, 38, 12], [56, 54, 36, 12], [90, 54, 44, 10], [140, 54, 48, 14]],
  doors: [
    { x: 82, y: 134, w: 28, h: 6, to: 'salon', spawn: { x: 171, y: 64, dir: 'down' } },
    { x: 182, y: 84, w: 6, h: 26, to: 'mutfak', spawn: { x: 16, y: 100, dir: 'right' } },
  ],
  spots: [
    { id: 'wardrobe', x: 24, y: 70, hit: [4, 10, 38, 56], label: () => 'Gardırop · dekor dolabı' },
    { id: 'desk', x: 112, y: 68, hit: [92, 28, 42, 36], label: (st) => (st.desk ? 'Masa lambasını söndür' : 'Masa lambasını yak') },
    { id: 'easel', x: 70, y: 70, hit: [56, 24, 34, 42], label: () => 'Birlikte çiz' },
    { id: 'booth', x: 160, y: 72, hit: [140, 4, 48, 64], label: () => 'Fotoğraf kabini' },
    { id: 'games', prop: 'gametable', x: 96, y: 118, hit: [80, 90, 32, 22], label: () => 'Oyun masası' },
  ],
  seats: [],
  lights: ({ st }) => [st.desk && { x: 109, y: 36, r: 52, a: 0.9, color: '255,200,120' }, { x: 174, y: 30, r: 30, a: 0.7, color: '255,220,150' }],
});

/** Yatak odası: birlikte 100 saat geçirince açılır (main.js). Çift kişilik yatak, iki komidin ve gece lambaları;
 *  ışık hep loş. Yatağa uzanan karakterin yalnızca başı yastıkta görünür, yorgan üstünü örter (AFK / uyku). Sağ kapı → şömine odası. */
const nightstand = (g, x) => {
  R(g, x, 50, 20, 14, C.woodD); R(g, x + 1, 50, 18, 2, C.woodL); R(g, x + 2, 54, 16, 4, C.wood); R(g, x + 9, 55, 2, 1, C.gold);
  R(g, x + 2, 59, 16, 4, C.wood); R(g, x + 9, 60, 2, 1, C.gold); R(g, x + 1, 64, 2, 2, C.woodD); R(g, x + 17, 64, 2, 2, C.woodD);
  R(g, x + 9, 44, 2, 6, C.metal); R(g, x + 6, 49, 8, 1, C.metal); // lamba ayağı (abajur canlı çizilir)
};
const yatak = makeScene({
  id: 'yatak',
  name: 'Yatak odası',
  colors: { wall: '#3b3566', accent: '#4a4380', floor: '#7a5a46', motif: 'dots' },
  dim: 0.45,
  draw(g, col) {
    wallpaper(g, col.wall, col.accent, col.motif);
    wainscot(g, shade(col.wall, -0.2), '#c9a36b');
    woodFloor(g, col.floor);
    // Pencere (gece gökyüzü canlı çizilir), tül perde
    R(g, 150, 8, 28, 26, C.woodD); R(g, 152, 10, 24, 22, '#141a3d');
    R(g, 146, 6, 6, 34, '#e9d8f0'); R(g, 176, 6, 6, 34, '#e9d8f0'); R(g, 144, 4, 40, 2, C.metal);
    // Yatak başlığı + çarşaf + yastıklar
    R(g, 62, 26, 68, 28, C.woodD); R(g, 64, 28, 64, 24, '#6b4a8a'); for (let x = 70; x < 126; x += 8) R(g, x, 32, 4, 16, '#7d5a9e');
    R(g, 62, 50, 68, 54, C.woodD); R(g, 64, 50, 64, 52, '#f4efe6');
    R(g, 68, 52, 24, 11, '#ffffff'); R(g, 100, 52, 24, 11, '#ffffff'); R(g, 68, 61, 24, 2, '#e3dccf'); R(g, 100, 61, 24, 2, '#e3dccf');
    nightstand(g, 40); nightstand(g, 132);
    // Kilim (yatağın ayak ucu)
    R(g, 58, 112, 76, 18, '#e9d8f0'); R(g, 60, 114, 72, 14, '#8a6fb0'); R(g, 64, 117, 64, 8, '#b39ddb');
    sideDoor(g, 'right', col.wall);
  },
  dyn(g, { st, t, hour }) {
    drawSky(g, 152, 10, 24, 22, hour, t); R(g, 163, 10, 2, 22, C.woodD);
    for (const x of [40, 132]) { R(g, x + 4, 38, 12, 7, st.bedlamp ? '#ffcf8a' : '#b8a48a'); R(g, x + 5, 38, 10, 1, st.bedlamp ? '#fff1c8' : '#cbb89c'); }
  },
  props: [
    { id: 'blanket', y: 106, draw(g) { // yorgan: uzananların gövdesini örter
      R(g, 64, 66, 64, 36, '#c4566c'); R(g, 64, 66, 64, 4, '#f4efe6'); R(g, 64, 70, 64, 1, '#a8445a');
      for (let x = 70; x < 126; x += 12) for (let y = 76; y < 100; y += 10) R(g, x, y, 3, 3, '#d97a8c');
      R(g, 62, 102, 68, 6, C.woodD); R(g, 62, 102, 68, 1, C.woodL); R(g, 62, 108, 3, 3, C.woodD); R(g, 127, 108, 3, 3, C.woodD);
    } },
    { id: 'plant', movable: true, y: 134, hit: [8, 100, 20, 36], block: [10, 128, 16, 6], draw(g) { plant(g, 18, 134, true); } },
  ],
  blocks: [[0, 0, W, 54], [38, 48, 24, 20], [130, 48, 24, 20], [60, 48, 72, 62]],
  doors: [{ x: 182, y: 84, w: 6, h: 26, to: 'somine', spawn: { x: 16, y: 96, dir: 'right' } }],
  spots: [
    { id: 'sit', group: 'bed', x: 96, y: 114, hit: [62, 26, 68, 84], label: () => 'Yatağa uzan' },
    { id: 'bedlamp', x: 50, y: 74, hit: [38, 36, 24, 32], label: (st) => (st.bedlamp ? 'Gece lambasını söndür' : 'Gece lambasını yak') },
    { id: 'bedlamp', x: 142, y: 74, hit: [130, 36, 24, 32], label: (st) => (st.bedlamp ? 'Gece lambasını söndür' : 'Gece lambasını yak') },
  ],
  seats: [{ x: 80, y: 70, pose: 'lie', group: 'bed' }, { x: 112, y: 70, pose: 'lie', group: 'bed' }],
  lights: ({ st }) => [
    st.bedlamp && { x: 50, y: 42, r: 46, a: 0.85, color: '255,170,90' },
    st.bedlamp && { x: 142, y: 42, r: 46, a: 0.85, color: '255,170,90' },
    { x: 164, y: 20, r: 22, a: 0.4, color: '170,180,255' },
  ],
});

/** Mutfak: tezgah, ocak (birlikte yemek yapma), buzdolabı, lavabo ve iki kişilik yemek masası. Sol kapı → hobi köşesi. */
const mutfak = makeScene({
  id: 'mutfak',
  name: 'Mutfak',
  colors: { wall: '#fff0d6', accent: '#ffd9a8', floor: '#d9c3a0', motif: 'stripes' },
  draw(g, col) {
    wallpaper(g, col.wall, col.accent, col.motif);
    // Fayans duvar (tezgah arkası)
    R(g, 0, 22, W, 28, '#ffffff'); for (let y = 22; y < 50; y += 7) for (let x = (y / 7) % 2 ? 0 : 7; x < W; x += 14) R(g, x, y, 7, 7, '#e8f4f7');
    tileFloor(g, WALL, col.floor, shade(col.floor, -0.08));
    // Üst dolaplar
    R(g, 40, 4, 110, 16, '#5b8def'); for (let x = 42; x < 148; x += 27) { R(g, x, 6, 25, 12, '#7aa4f5'); R(g, x + 11, 15, 3, 1, C.gold); }
    // Tezgah: lavabo, ocak, fırın
    R(g, 34, 44, 150, 22, '#5b8def'); R(g, 34, 42, 150, 4, '#e8e2d6'); R(g, 34, 46, 150, 1, '#c8c0b0');
    for (let x = 38; x < 180; x += 24) { R(g, x, 50, 22, 14, '#7aa4f5'); R(g, x + 9, 52, 4, 1, C.gold); }
    R(g, 44, 42, 22, 5, '#b8c4cc'); R(g, 46, 43, 18, 3, '#8fd0ff'); R(g, 54, 36, 2, 7, '#9aa3ad'); R(g, 54, 36, 6, 2, '#9aa3ad'); // lavabo
    R(g, 96, 40, 34, 6, '#2e2e3a'); for (const x of [100, 118]) { R(g, x, 41, 8, 4, '#4a4752'); } // ocak
    R(g, 98, 50, 30, 14, '#2e2e3a'); R(g, 100, 52, 26, 8, '#5a5560'); R(g, 102, 53, 22, 6, '#ffb36b'); // fırın camı
    // Buzdolabı
    R(g, 150, 10, 30, 56, '#e8f4f7'); R(g, 150, 10, 30, 2, '#ffffff'); R(g, 150, 30, 30, 1, '#b8c4cc'); R(g, 174, 16, 2, 10, '#9aa3ad'); R(g, 174, 34, 2, 14, '#9aa3ad');
    R(g, 156, 14, 5, 5, '#ff5d8f'); R(g, 163, 18, 5, 4, '#ffc93c'); // magnetler
    // Masa örtüsü (yemek masası ön planda çizilir)
    sideDoor(g, 'left', col.wall);
    R(g, 8, 4, 24, 26, C.woodD); R(g, 10, 6, 20, 22, '#5ec2ff'); // küçük pencere
  },
  dyn(g, { t, hour }) {
    drawSky(g, 10, 6, 20, 22, hour, t); R(g, 19, 6, 2, 22, C.woodD);
    if (DECOR.cooking) { // ocakta tencere + buhar
      R(g, 99, 34, 12, 7, '#9aa3ad'); R(g, 100, 34, 10, 2, '#b8c4cc');
      for (let i = 0; i < 3; i++) R(g, 101 + i * 4, 30 - ((t * 2 + i) % 2 | 0) * 3, 1, 3, 'rgba(255,255,255,0.7)');
    }
  },
  props: [
    { id: 'table', movable: true, y: 112, hit: [72, 88, 48, 26], block: [76, 96, 40, 14], draw(g) {
      R(g, 74, 94, 44, 14, '#ff7a59'); R(g, 74, 94, 44, 2, '#ffa58a'); for (let x = 76; x < 116; x += 8) R(g, x, 96, 4, 4, '#fff3dc');
      R(g, 78, 108, 3, 4, C.woodD); R(g, 111, 108, 3, 4, C.woodD);
      R(g, 84, 96, 8, 4, '#ffffff'); R(g, 100, 96, 8, 4, '#ffffff'); // tabaklar
    } },
    { id: 'plant', movable: true, y: 134, hit: [168, 100, 20, 36], block: [170, 128, 16, 6], draw(g) { plant(g, 178, 134, true); } },
  ],
  blocks: [[0, 0, W, 54], [34, 54, 150, 14]],
  doors: [{ x: 4, y: 84, w: 6, h: 26, to: 'hobi', spawn: { x: 176, y: 100, dir: 'left' } }],
  spots: [
    { id: 'cook', x: 113, y: 72, hit: [90, 30, 46, 38], label: () => 'Yemek yap' },
    { id: 'fridge', x: 165, y: 72, hit: [148, 8, 34, 60], label: () => 'Buzdolabı · tokluk' },
    { id: 'sit', group: 'table', prop: 'table', x: 96, y: 120, hit: [72, 88, 48, 26], label: () => 'Masaya otur' },
  ],
  seats: [{ x: 82, y: 104, group: 'table', prop: 'table' }, { x: 110, y: 104, group: 'table', prop: 'table' }],
  lights: () => [{ x: 113, y: 40, r: 40, a: 0.6, color: '255,210,150' }, { x: 20, y: 18, r: 28, a: 0.5, color: '200,220,255' }],
});

/** Admin odası: yalnızca şifreyle girilir (menü). Duvardaki büyük TV yalnızca istatistik gösterir. Alt kapı → salon, sol kapı → meyhane. */
const admin = makeScene({
  id: 'admin',
  name: 'Admin odası',
  colors: { wall: '#1b1f3a', accent: '#232850', floor: '#2a2d40', motif: 'dots' },
  draw(g, col) {
    wallpaper(g, col.wall, col.accent, col.motif);
    tileFloor(g, WALL, col.floor, shade(col.floor, 0.06));
    R(g, 36, 3, 120, 46, '#0a0c16'); R(g, 38, 5, 116, 42, '#141830'); R(g, 92, 49, 8, 4, C.metal); // TV
    R(g, 160, 12, 24, 52, '#2e2e3a'); for (let y = 16; y < 60; y += 6) R(g, 162, y, 20, 4, '#3a3a48'); // sunucu dolabı
    R(g, 8, 56, 44, 10, '#3a3f5c'); R(g, 8, 56, 44, 2, '#5a6080'); R(g, 14, 48, 14, 8, '#0a0c16'); R(g, 15, 49, 12, 6, '#2f9e8f'); // masa + monitör
    R(g, 30, 52, 10, 3, '#2e2e3a'); R(g, 31, 52, 8, 1, '#4a4752'); // klavye
    R(g, 3, 7, 30, 38, '#0a0c16'); R(g, 4, 8, 28, 36, '#000000'); // Eclip tabelası (logo ve ad canlı resim olarak üstüne gelir)
    R(g, 82, 138, 28, 6, '#c9a36b'); R(g, 80, 140, 32, 4, C.woodD); // alt kapı
    sideDoor(g, 'left', col.wall); // sol kapı → meyhane
  },
  dyn(g, { t }) {
    for (let y = 16; y < 60; y += 6) for (let i = 0; i < 3; i++) R(g, 164 + i * 5, y + 1, 2, 2, (Math.sin(t * 3 + y + i * 2) > 0 ? ['#4fbf6a', '#fcdf4b', '#ff5d8f'][i] : '#1a1a24'));
    // Masadaki bilgisayar hep açık: maç listesi gibi akan yeşil satırlar
    R(g, 15, 49, 12, 6, '#020604');
    for (let i = 0; i < 3; i++) { const w = 3 + ((i * 5 + (t * 2 | 0)) % 7); R(g, 16, 50 + i * 2, w, 1, i === 0 ? '#ffcf5a' : '#39ff88'); R(g, 24, 50 + i * 2, 2, 1, '#1f7a4a'); }
  },
  props: [
    { id: 'pool', y: 96, draw(g) { poolTable(g, 118, 72); } }, // koltuğun sağında
    { id: 'horses', y: 130, draw(g, { t }) { // mini at yarışı masası: toprak pist, kulvarlar, koşan atlar, bitiş çizgisi
      R(g, 8, 104, 60, 22, '#5a3420'); R(g, 10, 106, 56, 18, '#2f8f5a'); R(g, 11, 108, 54, 14, '#c9a36b');
      for (let i = 1; i < 3; i++) R(g, 11, 108 + i * 5 - 1, 54, 1, '#a8824f');
      for (let y = 108; y < 122; y += 2) R(g, 60 + ((y / 2) % 2), y, 1, 2, '#fff6e8'); // bitiş
      ['#c8742c', '#fcdf4b', '#5b8def'].forEach((c, i) => { const x = 13 + (((t * (6 + i * 2.3) + i * 11) % 42) | 0), y = 109 + i * 5; R(g, x, y, 4, 2, c); R(g, x + 3, y - 1, 2, 2, c); R(g, x, y + 2, 1, 1, '#26160f'); R(g, x + 3, y + 2, 1, 1, '#26160f'); });
      R(g, 11, 126, 3, 3, C.woodD); R(g, 62, 126, 3, 3, C.woodD);
    } },
    { id: 'roulette', y: 128, draw(g, { t }) { // rulet masası: ahşap kenar, yeşil çuha, solda çark, sağda sayı alanı
      R(g, 122, 104, 64, 22, '#5a3420'); R(g, 124, 106, 60, 18, '#1f8a4c'); R(g, 124, 106, 60, 1, '#3fae6a');
      R(g, 127, 108, 14, 14, '#3a2214'); R(g, 128, 109, 12, 12, '#c8323c'); R(g, 130, 111, 8, 8, '#1a1a22'); R(g, 132, 113, 4, 4, '#c9a36b');
      const k = (t * 3 | 0) % 4; R(g, 128 + [1, 9, 9, 1][k], 109 + [1, 1, 9, 9][k], 2, 2, '#ffffff'); // dönen top
      for (let c = 0; c < 8; c++) for (let r = 0; r < 3; r++) R(g, 145 + c * 4, 108 + r * 5, 3, 4, (c + r) % 2 ? '#c8323c' : '#1a1a22');
      R(g, 143, 108, 1, 14, '#e8f4f7'); R(g, 145, 123, 32, 1, '#e8f4f7');
      R(g, 166, 120, 3, 2, '#fcdf4b'); R(g, 170, 119, 3, 2, '#5b8def'); R(g, 174, 120, 3, 2, '#ff7a59'); // fişler
      R(g, 124, 126, 3, 3, C.woodD); R(g, 181, 126, 3, 3, C.woodD);
    } },
    { id: 'chair', y: 106, draw(g) { // bilgisayar koltuğu (TV'ye dönük; oturanın sırtını örter)
      R(g, 87, 88, 18, 6, '#26242c'); R(g, 88, 89, 16, 4, '#3a3a48'); // oturak (TV tarafında)
      R(g, 84, 88, 3, 8, '#26242c'); R(g, 105, 88, 3, 8, '#26242c'); // kolçaklar
      R(g, 88, 92, 16, 12, '#26242c'); R(g, 89, 93, 14, 10, '#3a3a48'); R(g, 90, 94, 12, 2, '#55556a'); // sırtlık bize dönük: oturan TV'ye bakar
      R(g, 95, 104, 2, 2, C.metal); // ayak
      R(g, 88, 106, 16, 1, C.metal); R(g, 87, 106, 2, 2, '#1a1a24'); R(g, 95, 106, 2, 2, '#1a1a24'); R(g, 103, 106, 2, 2, '#1a1a24'); // tekerlekler
    } },
  ],
  blocks: [[0, 0, W, 54], [6, 54, 48, 14], [158, 54, 28, 12], [86, 98, 22, 10], [122, 110, 64, 18], [118, 78, 50, 18], [8, 110, 60, 18]],
  doors: [{ x: 82, y: 134, w: 28, h: 6, to: 'salon', spawn: { x: 96, y: 120, dir: 'down' } }, { x: 4, y: 84, w: 6, h: 26, to: 'meyhane', spawn: { x: 172, y: 100, dir: 'left' } }],
  spots: [
    { id: 'admintv', x: 96, y: 66, hit: [36, 3, 120, 50], label: () => 'TV kumandası' },
    { id: 'home', x: 96, y: 128, hit: [78, 126, 36, 18], label: () => 'Evime dön' },
    { id: 'sit', group: 'chair', x: 96, y: 114, hit: [84, 82, 24, 26], label: () => 'Koltuğa otur' },
    { id: 'pc', x: 30, y: 72, hit: [6, 46, 48, 22], label: () => 'Bilgisayar' },
    { id: 'roulette', x: 154, y: 100, hit: [120, 102, 68, 28], label: () => 'Rulet oyna' },
    { id: 'adminpool', x: 143, y: 72, hit: [116, 70, 54, 28], label: () => 'Bilardo oyna' },
    { id: 'horses', x: 38, y: 100, hit: [6, 102, 64, 28], label: () => 'At yarışı' },
  ],
  seats: [{ x: 96, y: 101, pose: 'back', group: 'chair' }],
  lights: () => [{ x: 96, y: 26, r: 80, a: 0.8, color: '120,160,255' }, { x: 172, y: 36, r: 22, a: 0.6, color: '120,255,160' }, { x: 154, y: 112, r: 40, a: 0.7, color: '255,210,140' }, { x: 38, y: 114, r: 32, a: 0.6, color: '255,210,140' }],
});

/** Meyhane: admin odasının sol kapısından girilen eski İstanbul meyhanesi (yalnızca adminler). Sağ kapı → admin odası.
 *  Sararmış duvar, yeşil lambri, şişe rafları ve mermer tezgah, kareli örtülü tek uzun masa, duvarda ud, köşede fasıl sahnesi.
 *  Garson (admin.js) rakı isteyenleri sıraya koyup tezgahtan gelir, kadehlerini doldurur. */
// Meyhanenin masası: altı kişilik, üçü karşılıklı üç. Arka sıra bize dönük oturur (göğsüne kadar görünür), ön sıra
// sırtı bize dönük masaya oturur. Beyaz örtü, kenarında kırmızı şerit; tabaklar, buz kovası, ekmek sepeti, şişeler.
// Kadehler ve garsonun doldurması canlı çizilir (DECOR.meyGlasses / DECOR.meyPour, admin.js → meyhane.js doldurur).
export const MEY_TABLE = { x0: 44, x1: 138, y: 103 };
export const MEY_SEATS = [60, 91, 122].flatMap((x) => [{ x, y: 104 }, { x, y: 130, pose: 'back' }]).sort((a, b) => (a.pose ? 1 : 0) - (b.pose ? 1 : 0));
/** Bir sandalyenin kadehi: arka sıra kendi sağında masanın ön kenarında, ön sıra sandalyeler arasında arka tarafta. */
export const meyGlassAt = (seat) => (seat.pose === 'back' ? { x: seat.x + 15, y: MEY_TABLE.y + 4 } : { x: seat.x + 8, y: MEY_TABLE.y + 7 });
const meyTable = (g, t) => {
  const { x0, x1, y } = MEY_TABLE, w = x1 - x0;
  R(g, x0 - 1, y - 1, w + 2, 10, '#5a3420'); // ahşap kenar
  R(g, x0, y, w, 8, '#f7f2e8'); R(g, x0, y, w, 1, '#ffffff'); // örtünün üstü (iki sıra için derin)
  for (let x = x0 + 3; x < x1; x += 6) for (let yy = y + 2; yy < y + 8; yy += 3) R(g, x, yy, 1, 1, '#e6ddcc');
  R(g, x0, y + 8, w, 6, '#efe7d6'); R(g, x0, y + 9, w, 2, '#c8323c'); R(g, x0, y + 12, w, 1, '#c8323c'); // sarkan kısım
  for (let x = x0 + 1; x < x1; x += 3) R(g, x, y + 14, 1, 2, '#efe7d6'); // saçak
  for (const lx of [x0 + 3, x1 - 5]) { R(g, lx, y + 16, 2, 6, '#3a2214'); R(g, lx - 1, y + 21, 4, 1, '#2a180e'); }
  // Tabaklar: her oturanın önünde
  for (const st of MEY_SEATS) {
    const px = st.x - 4, py = st.pose === 'back' ? y + 5 : y + 2;
    R(g, px, py, 8, 3, '#ffffff'); R(g, px + 1, py + 1, 2, 1, st.x % 2 ? '#7fbf4a' : '#ff7a59'); R(g, px + 4, py + 1, 2, 1, '#f4d36b');
  }
  R(g, 74, y - 4, 9, 6, '#9aa3ad'); R(g, 75, y - 4, 7, 2, '#e8f4f7'); R(g, 76, y - 5, 2, 1, '#e8f4f7'); // buz kovası
  R(g, 101, y - 1, 10, 4, '#b48a44'); R(g, 102, y - 2, 8, 2, '#e8c27a'); // ekmek sepeti
  for (const bx of [86, 113]) { R(g, bx, y - 6, 3, 10, '#e8f4f7'); R(g, bx, y - 7, 3, 2, '#2f8f5a'); R(g, bx + 1, y - 4, 1, 7, '#ffffff'); R(g, bx, y - 1, 3, 2, '#c8323c'); } // rakı şişeleri
  // Kadehler: ince uzun; rakı suyla beyazlaşır
  for (const gl of DECOR.meyGlasses || []) {
    const gx = Math.round(gl.x), gb = Math.round(gl.y), fill = Math.round(7 * Math.max(0, Math.min(1, gl.level)));
    R(g, gx, gb - 9, 3, 9, 'rgba(255,255,255,0.28)'); R(g, gx, gb - 9, 1, 9, 'rgba(255,255,255,0.75)'); R(g, gx + 2, gb - 9, 1, 9, 'rgba(255,255,255,0.45)');
    if (fill) R(g, gx, gb - fill, 3, fill, '#f2efe6');
  }
  // Garson dolduruyor: kadehin üstünde eğik şişe ve şişeden süzülen ince rakı
  const p = DECOR.meyPour;
  if (p) {
    const bx = Math.round(p.x) + 3, by = Math.round(p.y) - 19;
    R(g, bx - 2, by - 2, 11, 7, 'rgba(20,30,25,0.55)');
    R(g, bx, by, 7, 4, '#e8f4f7'); R(g, bx + 6, by - 1, 2, 3, '#2f8f5a'); R(g, bx + 1, by + 1, 5, 1, '#ffffff'); R(g, bx - 1, by + 3, 2, 2, '#e8f4f7');
    R(g, bx + 2, by + 2, 3, 1, '#c8323c');
    const top = Math.round(p.y - 7 * Math.max(0, Math.min(1, p.k)));
    for (let yy = by + 5; yy < top; yy++) R(g, bx - 1 + (((t * 20 + yy) | 0) % 3 === 0 ? 1 : 0), yy, 2, 1, '#fffaf0');
  }
};
const meyChair = (g, x) => { // arka sıra: hasır sandalye sırtı (oturanın arkasında kalır)
  R(g, x - 5, 84, 10, 16, '#5a3420'); R(g, x - 4, 85, 8, 2, '#8a5a36'); R(g, x - 4, 89, 8, 1, '#8a5a36'); R(g, x - 4, 93, 8, 6, '#d9b36b');
  for (let i = 0; i < 4; i++) R(g, x - 4 + i * 2, 93, 1, 6, '#b48a44');
};
const meyChairFront = (g, x) => { // ön sıra: sandalyenin sırtı bize dönük, oturanın belini örter
  R(g, x - 6, 120, 12, 9, '#5a3420'); R(g, x - 5, 121, 10, 2, '#8a5a36'); R(g, x - 5, 124, 10, 1, '#8a5a36');
  R(g, x - 6, 129, 2, 4, '#3a2214'); R(g, x + 4, 129, 2, 4, '#3a2214');
};
const meyhane = makeScene({
  id: 'meyhane',
  name: 'Meyhane',
  colors: { wall: '#e6cf98', accent: '#dcc184', floor: '#cfc2a4' },
  dim: 0.4,
  draw(g, col) {
    R(g, 0, 0, W, WALL, col.wall);
    for (let x = 0; x < W; x += 3) R(g, x, 0, 1, 28, col.accent); // eskimiş, çizgili duvar kâğıdı
    R(g, 0, 0, W, 4, 'rgba(60,30,10,0.35)'); R(g, 0, 4, W, 3, 'rgba(60,30,10,0.15)'); // tütün sarısı tavan
    R(g, 0, 28, W, 22, '#2f4a3a'); R(g, 0, 28, W, 2, '#c9a36b'); R(g, 0, 48, W, 2, '#1e3226'); // yeşil lambri
    for (let x = 6; x < W; x += 20) { R(g, x, 32, 14, 1, '#4a6a54'); R(g, x, 32, 1, 13, '#4a6a54'); R(g, x, 45, 14, 1, '#1e3226'); }
    tileFloor(g, WALL, col.floor, '#4a3a30'); // siyah beyaz karo
    // Sol: şişe rafları ve mermer tezgah
    for (const y of [10, 20]) {
      R(g, 8, y + 7, 62, 2, '#5a3420');
      for (let x = 10; x < 68; x += 5) {
        const k = ((x + y) / 5) % 3;
        R(g, x, y + 1, 3, 6, k === 0 ? '#e8f4f7' : k === 1 ? '#b8e0c8' : '#c87a3a'); R(g, x + 1, y - 1, 1, 2, k === 1 ? '#2f8f5a' : '#e8f4f7');
      }
    }
    R(g, 6, 44, 66, 22, '#5a3420'); R(g, 6, 42, 66, 4, '#e8e2d6'); R(g, 6, 46, 66, 1, '#b8b0a0'); // tezgah + mermer
    for (let x = 10; x < 70; x += 15) { R(g, x, 50, 12, 13, '#6b4228'); R(g, x + 1, 51, 10, 11, '#7a4c2e'); }
    R(g, 14, 38, 6, 4, '#ffffff'); R(g, 16, 39, 2, 2, '#ff7a59'); R(g, 50, 36, 3, 6, '#e8f4f7'); R(g, 50, 36, 3, 1, '#2f8f5a'); // tabak, şişe
    R(g, 60, 34, 8, 8, '#f4d36b'); R(g, 61, 35, 6, 6, '#c8323c'); // küçük çerçeve: eski afiş
    // Orta: tabela (yazı canlı resim olarak gelir) ve sepya fotoğraflar
    R(g, 74, 4, 48, 18, '#3a2214'); R(g, 75, 5, 46, 16, '#1a0f08');
    for (const x of [78, 102]) { R(g, x, 25, 16, 13, '#3a2214'); R(g, x + 1, 26, 14, 11, '#c9a37a'); R(g, x + 3, 28, 10, 7, '#8a6a4a'); R(g, x + 6, 29, 4, 4, '#5a4030'); }
    // Sağ: duvarda ud ve eski radyo
    R(g, 136, 14, 14, 16, '#7a4c2e'); R(g, 134, 18, 18, 10, '#7a4c2e'); R(g, 138, 16, 10, 12, '#8a5a36'); R(g, 141, 20, 4, 4, '#3a2214');
    R(g, 142, 6, 2, 9, '#5a3420'); R(g, 141, 4, 4, 3, '#3a2214'); for (let i = 0; i < 3; i++) R(g, 141 + i, 15, 1, 12, '#e8d8b8');
    R(g, 158, 20, 22, 2, '#5a3420'); R(g, 160, 10, 18, 10, '#8a5a36'); R(g, 161, 11, 10, 8, '#d9b36b');
    for (let y = 12; y < 18; y += 2) R(g, 162, y, 8, 1, '#a8824f'); R(g, 173, 12, 3, 3, '#3a2214'); R(g, 173, 16, 3, 2, '#3a2214');
    // Sağ ön: fasıl sahnesi (alçak ahşap platform)
    R(g, 148, 114, 40, 24, '#6b4228'); R(g, 148, 114, 40, 2, '#8a5a36'); for (let x = 150; x < 188; x += 8) R(g, x, 117, 1, 21, '#5a3420');
    sideDoor(g, 'right', col.wall);
  },
  dyn(g, { t }) {
    // Tavandan sarkan çıplak ampuller, hafifçe titrer
    for (const x of [46, 96, 146]) {
      R(g, x, 0, 1, 10, '#2a1a10'); R(g, x - 2, 10, 5, 2, '#3a2a1a');
      R(g, x - 1, 12, 3, 4, Math.sin(t * 7 + x) > -0.92 ? '#fff1c8' : '#d9b36b');
    }
    // Radyonun ışığı
    R(g, 172, 18, 1, 1, Math.sin(t * 2) > 0 ? '#ffcf5a' : '#8a5a36');
  },
  props: [
    { id: 'chairs', y: 100, draw(g) { MEY_SEATS.filter((st) => !st.pose).forEach((st) => meyChair(g, st.x)); } },
    { id: 'table', y: 121, draw(g, { t }) { meyTable(g, t); } }, // arka sıradakilerin önünde, ön sıradakilerin arkasında
    { id: 'chairsFront', y: 133, draw(g) { MEY_SEATS.filter((st) => st.pose).forEach((st) => meyChairFront(g, st.x)); } },
    { id: 'stool', y: 126, draw(g) { // fasıl taburesi ve yanında darbuka
      R(g, 162, 120, 12, 3, '#8a5a36'); R(g, 163, 123, 2, 6, '#5a3420'); R(g, 171, 123, 2, 6, '#5a3420');
      R(g, 178, 120, 6, 4, '#c9a36b'); R(g, 179, 124, 4, 4, '#8a5a36'); R(g, 180, 128, 2, 2, '#6b4228');
    } },
  ],
  blocks: [[0, 0, W, 54], [6, 54, 66, 14], [MEY_TABLE.x0 + 2, 104, MEY_TABLE.x1 - MEY_TABLE.x0 - 4, 14], [MEY_TABLE.x0, 120, MEY_TABLE.x1 - MEY_TABLE.x0, 12]],
  doors: [{ x: 182, y: 84, w: 6, h: 26, to: 'admin', spawn: { x: 18, y: 96, dir: 'right' } }],
  spots: [
    { id: 'sit', group: 'meyt', x: 91, y: 138, hit: [MEY_TABLE.x0 - 4, 82, MEY_TABLE.x1 - MEY_TABLE.x0 + 8, 54], label: () => 'Masaya otur' },
    { id: 'radio', x: 168, y: 72, hit: [154, 6, 30, 20], label: () => 'Radyo' },
    { id: 'sit', group: 'fasil', x: 168, y: 132, hit: [156, 112, 32, 26], label: () => 'Fasıl taburesine otur' },
  ],
  seats: [...MEY_SEATS.map((st) => ({ ...st, group: 'meyt' })), { x: 168, y: 120, group: 'fasil' }],
  lights: () => [
    { x: 46, y: 16, r: 46, a: 0.85, color: '255,190,110' }, { x: 96, y: 16, r: 50, a: 0.85, color: '255,190,110' }, { x: 146, y: 16, r: 46, a: 0.85, color: '255,190,110' },
    { x: 60, y: 100, r: 34, a: 0.5, color: '255,170,90' }, { x: 120, y: 100, r: 34, a: 0.5, color: '255,170,90' }, { x: 168, y: 118, r: 28, a: 0.5, color: '255,150,90' },
  ],
});

export const SCENES = { salon, somine, balkon, hobi, yatak, mutfak, admin, meyhane };
/** Yalnızca adminlerin girebildiği sahneler (ortak oda: konumlar, ses ve sohbet paylaşılır). */
export const ADMIN_SCENES = new Set(['admin', 'meyhane']);
export const DEFAULT_STATE = { lamp: true, tv: false, fire: true, lights: true, desk: true, bedlamp: true };

// ---------- Yerleşim (taşınan eşyalar + dekor dahil) ----------
const shift = (b, dx, dy) => [b[0] + dx, b[1] + dy, b[2], b[3]];
/** Sahnenin o anki yerleşimi: eşyalar, engeller, etkileşim noktaları, koltuklar, ışıklar. Önbellekli. */
export function layout(sc) {
  if (sc._v === DECOR.v) return sc._lay;
  const moved = DECOR.moved[sc.id] || {};
  const off = (id) => (id && moved[id]) || { dx: 0, dy: 0 };
  const props = sc.props.map((p) => { const o = off(p.id); return { ...p, dx: o.dx, dy: o.dy, sortY: p.y + o.dy, hit: p.hit && shift(p.hit, o.dx, o.dy) }; });
  const items = Object.entries(DECOR.items[sc.id] || {}).map(([key, it]) => (CATALOG[it.type] ? { key, ...it, c: CATALOG[it.type] } : null)).filter(Boolean);
  const blocks = [...sc.blocks];
  props.forEach((p) => p.block && blocks.push(shift(p.block, p.dx, p.dy)));
  items.forEach((it) => { const b = it.c.block; if (b && !it.c.wall) blocks.push([it.x + b[0], it.y + b[1], b[2], b[3]]); });
  const spots = sc.spots.map((s) => { const o = off(s.prop); return { ...s, x: s.x + o.dx, y: s.y + o.dy, hit: s.hit && shift(s.hit, o.dx, o.dy) }; });
  (sc.frames || []).forEach((f) => {
    const o = off(f.id);
    // Duvar eşyası: en arkada çizilir, dekor modunda duvar üzerinde sürüklenir
    props.push({ id: f.id, movable: true, wall: true, frame: f, dx: o.dx, dy: o.dy, sortY: -1000, hit: shift(f.outer, o.dx, o.dy),
      draw: (g) => frame(g, ...f.outer, (x, y, w, h) => sc.frameArt[f.id](g, x, y, w, h)) });
    spots.push({ id: 'frame', frame: f.id, x: f.x + f.w / 2 + o.dx, y: 60, hit: shift(f.outer, o.dx, o.dy), label: () => (DECOR.frames[f.id] ? 'Fotoğrafa bak' : 'Fotoğraf koy') });
  });
  const seats = sc.seats.map((s) => { const o = off(s.prop); return { ...s, x: s.x + o.dx, y: s.y + o.dy }; });
  items.forEach((it) => {
    if (!it.c.seat) return;
    const group = 'item:' + it.key;
    seats.push({ x: it.x + it.c.seat.dx, y: it.y + it.c.seat.dy, group });
    spots.push({ id: 'sit', group, x: it.x, y: it.y + 6, hit: [it.x - it.c.w / 2, it.y - it.c.h, it.c.w, it.c.h], label: () => 'Otur' });
  });
  sc._v = DECOR.v;
  sc._lay = { props, items, blocks, spots, seats };
  return sc._lay;
}
/** Işıklar: sahnenin kendi ışıkları (taşınan eşyayla birlikte kayar) + dekor ışıkları. */
export function lightsOf(sc, info) {
  const lay = layout(sc), moved = DECOR.moved[sc.id] || {};
  const out = sc.lights(info).filter(Boolean).map((l) => (l.prop && moved[l.prop] ? { ...l, x: l.x + moved[l.prop].dx, y: l.y + moved[l.prop].dy } : l));
  lay.items.forEach((it) => it.c.light && out.push(it.c.light(it.x, it.y, info)));
  return out;
}
