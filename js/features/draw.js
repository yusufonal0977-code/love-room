// Şövale: birlikte çizim. İkiniz aynı tuvale aynı anda çizersiniz; çizgiler çizilirken karşıya akar.
// Tuvalin küçük hali hobi köşesindeki şövalede görünür.
//
// live/{rid}/draw/{id} = { c: renk, s: kalınlık, p: "x,y,x,y…" (0–1000), by }
import { h, icon, openSheet, toast } from '../ui.js';
import { onChildAdded, onChildChanged, onChildRemoved, push, remove, set } from '../fb.js';
import { DECOR, bump } from '../scenes.js';
import { t } from '../i18n.js';

const COLORS = ['#26160f', '#ff4f7b', '#ff7a59', '#ffc93c', '#4fbf6a', '#3fb7a4', '#5b8def', '#9b6bff', '#8a5638', '#ffffff'];
const SIZES = [4, 10, 22];
const CW = 800, CH = 600;

export function createDraw(ctx) {
  const { live, uid } = ctx;
  const strokes = new Map();
  const canvas = h('canvas', { width: CW, height: CH, class: 'drawcanvas' });
  const g = canvas.getContext('2d');
  const thumb = h('canvas', { width: 320, height: 240 });
  let color = COLORS[1], size = SIZES[1], mine = [];

  function clearCanvas() { g.fillStyle = '#fffaf0'; g.fillRect(0, 0, CW, CH); }
  function drawStroke(st) {
    const p = (st.p || '').split(',').map(Number);
    if (p.length < 2) return;
    g.strokeStyle = st.c; g.fillStyle = st.c; g.lineWidth = st.s; g.lineCap = g.lineJoin = 'round';
    g.beginPath();
    g.moveTo((p[0] / 1000) * CW, (p[1] / 1000) * CH);
    if (p.length === 2) { g.arc((p[0] / 1000) * CW, (p[1] / 1000) * CH, st.s / 2, 0, Math.PI * 2); g.fill(); return; }
    for (let i = 2; i < p.length; i += 2) g.lineTo((p[i] / 1000) * CW, (p[i + 1] / 1000) * CH);
    g.stroke();
  }
  function redraw() { clearCanvas(); strokes.forEach(drawStroke); updateThumb(); }
  let thumbT = null;
  function updateThumb() {
    clearTimeout(thumbT);
    thumbT = setTimeout(() => {
      DECOR.drawing = strokes.size > 0;
      const t = thumb.getContext('2d');
      t.drawImage(canvas, 0, 0, thumb.width, thumb.height);
      ctx.game.setPicture('easel', 'hobi', [60, 32, 20, 16], strokes.size ? thumb.toDataURL('image/jpeg', 0.85) : null);
      bump();
    }, 600);
  }
  clearCanvas();

  const r = live.ref('draw');
  onChildAdded(r, (s) => { strokes.set(s.key, s.val()); drawStroke(s.val()); updateThumb(); });
  onChildChanged(r, (s) => { strokes.set(s.key, s.val()); drawStroke(s.val()); updateThumb(); });
  onChildRemoved(r, (s) => { strokes.delete(s.key); redraw(); });

  // ---------- Çizim girdisi ----------
  let cur = null, sendT = 0;
  const pt = (e) => { const b = canvas.getBoundingClientRect(); return [Math.round(((e.clientX - b.left) / b.width) * 1000), Math.round(((e.clientY - b.top) / b.height) * 1000)]; };
  canvas.onpointerdown = (e) => {
    try { canvas.setPointerCapture(e.pointerId); } catch { /* sentetik olay */ }
    const key = push(r).key;
    cur = { key, st: { c: color, s: size, p: pt(e).join(','), by: uid } };
    mine.push(key);
    strokes.set(key, cur.st); drawStroke(cur.st);
    set(live.ref(`draw/${key}`), cur.st);
  };
  canvas.onpointermove = (e) => {
    if (!cur) return;
    cur.st.p += ',' + pt(e).join(',');
    drawStroke(cur.st);
    if (performance.now() - sendT > 70) { sendT = performance.now(); set(live.ref(`draw/${cur.key}`), cur.st); }
  };
  const end = () => { if (!cur) return; set(live.ref(`draw/${cur.key}`), cur.st); cur = null; live.stat('strokes'); };
  canvas.onpointerup = end; canvas.onpointercancel = end;

  function open() {
    const body = openSheet({ title: 'Şövale · birlikte çiz', iconName: 'brush', wide: true });
    const sw = h('div', { class: 'swatches' });
    const paintSw = () => {
      sw.innerHTML = '';
      COLORS.forEach((c) => sw.append(h('button', { class: 'sw' + (c === color ? ' sel' : ''), style: { background: c }, title: c === '#ffffff' ? 'Silgi' : '', onclick: () => { color = c; paintSw(); } })));
      SIZES.forEach((s) => sw.append(h('button', { class: 'size' + (s === size ? ' sel' : ''), onclick: () => { size = s; paintSw(); } }, h('i', { style: { width: s / 2 + 4 + 'px', height: s / 2 + 4 + 'px' } }))));
    };
    paintSw();
    body.append(sw, canvas, h('div', { class: 'row wrap' },
      h('button', { onclick: () => { const k = mine.pop(); if (k) remove(live.ref(`draw/${k}`)); } }, 'Geri al'),
      h('button', { onclick: () => { if (confirm(t('Tuval ikiniz için de temizlensin mi?'))) { remove(r); mine = []; } } }, 'Temizle'),
      h('button', { class: 'primary', html: `${icon('album')} Albüme kaydet`, onclick: async () => { await ctx.photos.addToAlbum(canvas.toDataURL('image/jpeg', 0.85), t('Birlikte çizdik')); toast('Resim albüme kaydedildi 🎨'); } }),
    ), h('p', { class: 'small' }, 'Beyaz renk silgi gibi çalışır. Çizdiğiniz resim hobi köşesindeki şövalede durur.'));
  }

  return { open };
}
