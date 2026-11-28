// Dört sahne: Salon (merkez), Şömine odası (sol kapı), Balkon (sağ kapı), Hobi köşesi (arka kapı).
// Her sahne: statik arka plan (boyaya göre yeniden çizilir), canlı parçalar, y'ye göre sıralanan ön plan eşyaları,
// çarpışma kutuları, kapılar, etkileşim noktaları, oturma yerleri, foto çerçeveleri ve ışık kaynakları.
// Taşınabilir eşyaların kaydırması, yerleştirilen dekor ve oda boyası DECOR'da tutulur (ikinize ortak).
import { drawFireplace, drawFire, drawMantel, fireFlicker, FIRE_LIGHT_Y } from './semine.js';
import { R, shade } from './art.js';
import { C, CATALOG, plant } from './decor.js';
import { drawSomine, drawSomineClock, armchair as pixArmchair, drawBalkon, drawCity, railing, lightChain, candleTable, foosball, poolTable as pixPool, flower as pixFlower, drawHobi, drawHobiDyn, gameTable, drawYatak, drawYatakDyn, blanket as pixBlanket, drawMutfak, drawMutfakDyn, kitchenTable } from './rooms-pix.js';
import { drawSalon, drawSalonDyn, sofaBack, lamp as pixLamp, jarTable, plant as pixPlant } from './salon-pix.js';

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
function frame(g, x, y, w, h, art) { // piksel sanat: koyu dış hat, kabartmalı altın çerçeve
  R(g, x + 1, y + h, w - 1, 1, 'rgba(0,0,0,0.25)');
  R(g, x, y, w, h, '#26160f'); R(g, x + 1, y + 1, w - 2, h - 2, '#c8901c');
  R(g, x + 1, y + 1, w - 2, 1, '#fff1a8'); R(g, x + 1, y + 1, 1, h - 2, '#ffd75e'); R(g, x + w - 2, y + 2, 1, h - 3, '#8a5a12'); R(g, x + 1, y + h - 2, w - 2, 1, '#8a5a12');
  R(g, x + 2, y + 2, w - 4, h - 4, '#26160f');
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
  draw(g, col) { drawSalon(g, col, wallpaper); }, // piksel sanat sürümü: salon-pix.js
  dyn(g, { st, hour, t }) {
    drawSky(g, 8, 8, 24, 24, hour, t);
    drawSalonDyn(g, { st, t }, DECOR);
  },
  props: [
    { id: 'sofa', y: 132, draw(g) { sofaBack(g); } },
    { id: 'lamp', movable: true, y: 120, hit: [20, 68, 20, 54], block: [22, 114, 16, 6], draw(g, { st }) { pixLamp(g, st.lamp); } },
    { id: 'jartable', movable: true, y: 118, hit: [140, 88, 24, 32], block: [143, 112, 18, 6], draw(g) { jarTable(g); } },
    { id: 'plantL', movable: true, y: 134, hit: [4, 100, 18, 36], block: [6, 128, 14, 6], draw(g) { pixPlant(g, 13, 134); } },
    { id: 'plantR', movable: true, y: 136, hit: [170, 102, 20, 36], block: [172, 130, 14, 6], draw(g) { pixPlant(g, 180, 136); } },
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
  draw(g, col) { drawSomine(g, col, wallpaper, () => { drawFireplace(g, col.fireplace); drawMantel(g, col.mantel, col.fireplace); }); }, // şömine tasarımcı çizimi
  dyn(g, { st, t, hour }) {
    drawSomineClock(g, hour, t);
    if (!st.fire) return;
    const fp = DECOR.paint.somine?.fireplace;
    drawFire(g, t, fp);
    // Zemine vuran sıcak parıltı: ocağın önünde, alevle birlikte titrer
    const f = fireFlicker(t, fp);
    [[48, 0.17], [40, 0.13], [32, 0.10], [24, 0.07], [16, 0.05]].forEach(([w, a], i) => R(g, 96 - w / 2, 66 + i, w, 1, `rgba(255,150,60,${(a * f).toFixed(3)})`));
  },
  props: [
    { id: 'armchair', movable: true, y: 88, hit: [146, 58, 34, 32], block: [146, 70, 34, 20], draw(g) { pixArmchair(g); } },
    { id: 'plant', movable: true, y: 128, hit: [18, 94, 24, 36], block: [20, 122, 20, 6], draw(g) { pixPlant(g, 30, 128); } },
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
  // Ateşin ışığı alevle birlikte titrer: geniş turuncu ışık + ocağın önünde yerde daha sıcak bir leke; gündüz de hafifçe hissedilir (glow)
  lights: ({ st, t }) => {
    const fp = DECOR.paint.somine?.fireplace, f = st.fire ? fireFlicker(t, fp) : 1;
    return [
      st.fire && { x: 96, y: FIRE_LIGHT_Y[fp] || 58, r: 84 + 60 * (f - 1), a: Math.min(1, 0.82 + 0.9 * (f - 1)), color: '255,140,60', glow: 1.7 * f },
      st.fire && { x: 96, y: 67, r: 36 + 24 * (f - 1), a: 0.4, color: '255,175,90', glow: 0.8 * f },
    ];
  },
});

/** Bilardo masası (balkon); (x, y) sol üst köşe. */
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
  draw(g, col) { drawBalkon(g, col); },
  dyn(g, { hour, partnerHour, t, st }) {
    // İki saat dilimi farklıysa gökyüzü ikiye bölünür: sol senin, sağ partnerinin gökyüzü
    const split = partnerHour !== null && Math.abs(((partnerHour - hour + 36) % 24) - 12) < 10;
    if (split) { drawSky(g, 0, 0, W / 2, 58, hour, t); drawSky(g, W / 2, 0, W / 2, 58, partnerHour, t); R(g, W / 2, 0, 1, 58, 'rgba(255,255,255,0.35)'); }
    else drawSky(g, 0, 0, W, 58, hour, t);
    const night = skyColors(hour)[2];
    drawCity(g, night);
    railing(g);
    lightChain(g, st.lights, t);
  },
  props: [
    { id: 'candle', movable: true, y: 112, hit: [136, 88, 26, 26], block: [138, 104, 22, 8], draw(g) { candleTable(g); } },
    { id: 'foos', movable: true, y: 132, hit: [12, 106, 48, 28], block: [14, 118, 44, 14], draw(g) { foosball(g); } },
    { id: 'pool', movable: true, y: 132, hit: [70, 104, 54, 30], block: [72, 114, 50, 18], draw(g) { pixPool(g, 72, 108); } },
    { id: 'flower', movable: true, y: 126, hit: [158, 92, 26, 36], block: [162, 120, 16, 6], draw(g, { t }) { pixFlower(g, 170, 126, t, DECOR.flower); } },
    { id: 'plant', movable: true, y: 134, hit: [180, 102, 12, 34], block: [178, 128, 12, 6], draw(g) { pixPlant(g, 184, 134, true); } },
  ],
  blocks: [[0, 0, W, 72], [64, 68, 64, 22]],
  doors: [{ x: 4, y: 84, w: 6, h: 28, to: 'salon', spawn: { x: 176, y: 96, dir: 'left' } }],
  spots: [
    { id: 'sit', group: 'bench', x: 96, y: 96, hit: [64, 66, 64, 26], label: () => 'Banka otur' },
    { id: 'sky', x: 60, y: 78, hit: [0, 0, W, 56], label: () => 'Gökyüzüne bak' },
    { id: 'lights', x: 140, y: 78, hit: [0, 4, W, 12], label: (st) => (st.lights ? 'Işıkları söndür' : 'Işıkları yak') },
    { id: 'foos', prop: 'foos', x: 36, y: 104, hit: [12, 106, 48, 28], label: () => 'Langırt oyna' },
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
  draw(g, col) { drawHobi(g, col, wallpaper); },
  dyn(g, { st }) { drawHobiDyn(g, st, DECOR.drawing); },
  props: [
    { id: 'gametable', movable: true, y: 110, hit: [80, 90, 32, 22], block: [82, 102, 28, 8], draw(g) { gameTable(g); } },
    { id: 'plantR', movable: true, y: 130, hit: [166, 96, 22, 36], block: [168, 124, 16, 6], draw(g) { pixPlant(g, 176, 130); } },
    { id: 'plantL', movable: true, y: 128, hit: [8, 102, 20, 28], block: [10, 122, 16, 6], draw(g) { pixPlant(g, 18, 128, true); } },
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
  draw(g, col) { drawYatak(g, col, wallpaper); },
  dyn(g, { st, t, hour }) { drawYatakDyn(g, st, hour, t, drawSky); },
  props: [
    { id: 'blanket', y: 106, draw(g) { pixBlanket(g); } }, // yorgan: uzananların gövdesini örter
    { id: 'plant', movable: true, y: 134, hit: [8, 100, 20, 36], block: [10, 128, 16, 6], draw(g) { pixPlant(g, 18, 134); } },
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
  draw(g, col) { drawMutfak(g, col, wallpaper); },
  dyn(g, { t, hour }) { drawMutfakDyn(g, t, hour, drawSky, DECOR); },
  props: [
    { id: 'table', movable: true, y: 112, hit: [72, 88, 48, 26], block: [76, 96, 40, 14], draw(g) { kitchenTable(g); } },
    { id: 'plant', movable: true, y: 134, hit: [168, 100, 20, 36], block: [170, 128, 16, 6], draw(g) { pixPlant(g, 178, 134); } },
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

export const SCENES = { salon, somine, balkon, hobi, yatak, mutfak };
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
