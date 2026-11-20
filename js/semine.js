// Şömine odasının yeniden çizilen şömineleri (koyu ahşap ve tuğla). Veri (tasarımcı çizimleri) semine-art.js'te; burada sönük hali
// tuvale hazırlanır ve ateş kutusunun içindeki alev, çizimin satırlarını alta sabit tutup boyuna esneterek canlandırılır
// (alevin uçları uzar kısalır). Şömine odanın ortasına (x 96) oturur, tabanı y 66'da biter.
import { SEMINE } from './semine-art.js';

const N = 8; // alev kare sayısı; döngü ~0,9 sn
const CX = 96, BASE_Y = 66;
const MODELS = {};

export const FIREPLACES = [['ahsap', 'Koyu ahşap'], ['tugla', 'Tuğla']];
/** Her modelin raf süsleri (sade hep var); seçimde gösterilen ad ve sıra. */
export const MANTELS = {
  ahsap: [['none', 'Sade'], ['gemi', 'Gemi'], ['tablo', 'Tablo ve mumlar'], ['isik', 'Işık zinciri'], ['dantel', 'Dantel kenar'], ['susler', 'Asılı süsler']],
  tugla: [['none', 'Sade'], ['vazo', 'Çiçek vazosu'], ['tablo', 'Tablo ve mumlar'], ['kitap', 'Kitaplar']],
};
/** Ateş ışığının dikey merkezi (modele göre alev biraz farklı yükseklikte). */
export const FIRE_LIGHT_Y = { ahsap: 58, tugla: 56 };

const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const dot = (g, x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
const norm = (id) => (SEMINE[id] ? id : 'ahsap');

function model(id) {
  id = norm(id);
  if (MODELS[id]) return MODELS[id];
  const { pal, rows, fireY, fire, bg } = SEMINE[id];
  const W = rows[0].length, H = rows.length, n = fire.length, bottom = n - 1;
  const base = canvasOf(W, H), bg2 = base.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') dot(bg2, x, y, pal[ch]); }));
  fire.forEach(([lo, hi], i) => { for (let x = lo; x <= hi; x++) dot(bg2, x, fireY + i, bg); }); // ateş sönükken kutunun içi koyu
  // Çizimdeki alev: satır satır, sütun sütun renkler
  const src = fire.map(([lo, hi], i) => { const o = {}; for (let x = lo; x <= hi; x++) o[x] = pal[rows[fireY + i][x]] || bg; return o; });
  const frames = [];
  for (let k = 0; k < N; k++) {
    const c = canvasOf(W, H), g = c.getContext('2d');
    fire.forEach(([lo, hi], i) => {
      for (let x = lo; x <= hi; x++) {
        // Sütuna göre dalgalanan uzama: 1'den büyükse o sütunun alevi uzar
        const s = 1 + 0.14 * Math.sin((2 * Math.PI * k) / N + x * 0.55) + 0.08 * Math.sin((4 * Math.PI * k) / N + x * 1.6 + 1.3);
        const sy = Math.round(bottom - (bottom - i) / s);
        dot(g, x, fireY + i, sy < 0 ? bg : (src[Math.min(sy, bottom)][x] || bg));
      }
    });
    frames.push(c);
  }
  // Her karenin parlaklığı: yanan (kırmızı/turuncu/sarı) piksel sayısı, ortalamaya göre; ışık ve zemin parıltısı alevle birlikte titrer
  const lit = frames.map((c) => { const d = c.getContext('2d').getImageData(0, 0, W, H).data; let k = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] && d[i] > 120) k++; return k; });
  const avg = lit.reduce((a, b) => a + b, 0) / lit.length || 1;
  return (MODELS[id] = { id, W, H, base, frames, bright: lit.map((k) => k / avg), layers: {}, ox: CX - (W >> 1), oy: BASE_Y - H });
}

/** Şöminenin sönük hali; model: 'ahsap' | 'tugla'. */
export function drawFireplace(g, id) { const m = model(id); g.drawImage(m.base, m.ox, m.oy); }
/** Ateş yanarken alev karesi; t saniye. */
export function drawFire(g, t, id) { const m = model(id); g.drawImage(m.frames[Math.floor(t * 9) % N], m.ox, m.oy); }
/** Ateşin o anki parlaklığı: ortalama 1, alev karesine göre ~0,85-1,15; hızlı küçük bir titreme eklenir. Işık yarıçapı ve zemin parıltısı bunu kullanır. */
export function fireFlicker(t, id) { return model(id).bright[Math.floor(t * 9) % N] + 0.03 * Math.sin(t * 31) + 0.02 * Math.sin(t * 17 + 1); }

function layer(m, name) {
  if (m.layers[name]) return m.layers[name];
  const o = SEMINE[m.id].mantel[name], c = canvasOf(o.rows[0].length, o.rows.length), g = c.getContext('2d');
  o.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') dot(g, x, y, o.pal[ch]); }));
  return (m.layers[name] = c);
}
/** Seçilen raf süsünü şöminenin üstüne çizer. */
export function drawMantel(g, name, id) {
  const m = model(id), o = SEMINE[m.id].mantel[name];
  if (o) g.drawImage(layer(m, name), m.ox + o.x, m.oy + o.y);
}
/** Seçim düğmesindeki küçük resim (64x64): şömine, ilk alev karesi ve raf süsü. */
export function fireplaceThumb(id, name) {
  const m = model(id), c = canvasOf(64, 64), g = c.getContext('2d');
  const dx = 32 - (m.W >> 1), dy = 64 - m.H; // tabanı alta, ortası ortaya
  g.drawImage(m.base, dx, dy); g.drawImage(m.frames[0], dx, dy);
  const o = SEMINE[m.id].mantel[name];
  if (o) g.drawImage(layer(m, name), dx + o.x, dy + o.y);
  return c;
}
