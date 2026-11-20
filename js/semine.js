// Şömine odasının yeniden çizilen şöminesi. Veri (tasarımcının çizimi) semine-art.js'te; burada sönük hali tuvale hazırlanır
// ve ateş kutusunun içindeki alev, çizimin satırlarını alta sabit tutup boyuna esneterek canlandırılır (alevin uçları uzar kısalır).
import { SEMINE } from './semine-art.js';

const N = 8; // alev kare sayısı; döngü ~0,9 sn
let base = null, frames = null, bright = null;

const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const dot = (g, x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };

function build() {
  const { pal, rows, fireY, fire } = SEMINE;
  const W = rows[0].length, H = rows.length, n = fire.length, bottom = n - 1;
  base = canvasOf(W, H);
  const bg = base.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') dot(bg, x, y, pal[ch]); }));
  fire.forEach(([lo, hi], i) => { for (let x = lo; x <= hi; x++) dot(bg, x, fireY + i, '#000000'); }); // ateş sönükken kutunun içi siyah
  // Çizimdeki alev: satır satır, sütun sütun renkler
  const src = fire.map(([lo, hi], i) => { const o = {}; for (let x = lo; x <= hi; x++) o[x] = pal[rows[fireY + i][x]] || '#000000'; return o; });
  frames = [];
  for (let k = 0; k < N; k++) {
    const c = canvasOf(W, H), g = c.getContext('2d');
    fire.forEach(([lo, hi], i) => {
      for (let x = lo; x <= hi; x++) {
        // Sütuna göre dalgalanan uzama: 1'den büyükse o sütunun alevi uzar
        const s = 1 + 0.14 * Math.sin((2 * Math.PI * k) / N + x * 0.55) + 0.08 * Math.sin((4 * Math.PI * k) / N + x * 1.6 + 1.3);
        const sy = Math.round(bottom - (bottom - i) / s);
        const col = sy < 0 ? '#000000' : (src[Math.min(sy, bottom)][x] || '#000000');
        dot(g, x, fireY + i, col);
      }
    });
    frames.push(c);
  }
  // Her karenin parlaklığı: yanan (siyah/gri olmayan) piksel sayısı, ortalamaya göre; ışık ve zemin parıltısı alevle birlikte titrer
  const lit = frames.map((c) => { const d = c.getContext('2d').getImageData(0, 0, W, H).data; let k = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] && d[i] > 120) k++; return k; });
  const avg = lit.reduce((a, b) => a + b, 0) / lit.length || 1;
  bright = lit.map((k) => k / avg);
}

/** Şöminenin sönük hali (tuğla yerine koyu ahşap); (x, y) çizimin sol üst köşesi. */
export function drawFireplace(g, x, y) { if (!base) build(); g.drawImage(base, x, y); }
/** Ateş yanarken alev karesi; t saniye. */
export function drawFire(g, x, y, t) { if (!base) build(); g.drawImage(frames[Math.floor(t * 9) % N], x, y); }
/** Ateşin o anki parlaklığı: ortalama 1, alev karesine göre ~0,85-1,15; hızlı küçük bir titreme eklenir. Işık yarıçapı ve zemin parıltısı bunu kullanır. */
export function fireFlicker(t) { if (!base) build(); return bright[Math.floor(t * 9) % N] + 0.03 * Math.sin(t * 31) + 0.02 * Math.sin(t * 17 + 1); }

/** Raf süsleri (sade şömineye göre fark katmanları); seçimde gösterilen ad ve sıra. */
export const MANTELS = [['none', 'Sade'], ['gemi', 'Gemi'], ['tablo', 'Tablo ve mumlar'], ['isik', 'Işık zinciri'], ['dantel', 'Dantel kenar'], ['susler', 'Asılı süsler']];
const layers = {};
function layer(id) {
  if (layers[id]) return layers[id];
  const o = SEMINE.mantel[id], c = canvasOf(o.rows[0].length, o.rows.length), g = c.getContext('2d');
  o.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') dot(g, x, y, o.pal[ch]); }));
  return (layers[id] = c);
}
/** Seçilen raf süsünü şöminenin üstüne çizer; (x, y) şömine çizimiyle aynı sol üst köşe. */
export function drawMantel(g, id, x, y) { const o = SEMINE.mantel[id]; if (o) g.drawImage(layer(id), x + o.x, y + o.y); }
/** Seçim düğmesindeki küçük resim (64x64): şömine, ilk alev karesi ve raf süsü. */
export function mantelThumb(id) {
  if (!base) build();
  const c = canvasOf(64, 64), g = c.getContext('2d');
  g.drawImage(base, 5, 17); g.drawImage(frames[0], 5, 17); drawMantel(g, id, 5, 17);
  return c;
}
