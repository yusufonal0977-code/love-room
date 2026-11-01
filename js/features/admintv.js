// Admin odasının TV'si: veri ekranı ile normal TV arasında geçiş ve link yapıştırıp site/video açma.
//
// Oda tek ve ortak olduğu için ekran da ortaktır; biri değiştirince odadaki herkes aynısını görür.
//   admin/config/tv = { mode: 'stats'|'tv', kind: 'yt'|'file'|'web', src, start, at, by }
// Odadaki küçük ekran yalnızca gösterir (dokununca kumanda açılır); sitede gezinmek için "Büyüt" tam ekran yapar.
// Bazı siteler (Google, Instagram vb.) başka sitenin içinde açılmayı engeller: onlar için "Yeni sekmede aç" var.
import { h, icon, openSheet, closeSheet, toast } from '../ui.js';
import { db, ref, set, update, onValue, serverTimestamp, now } from '../fb.js';
import { W, H } from '../scenes.js';
import { t } from '../i18n.js';
import { parseLink } from './tv.js';

const YT_ID = /^[\w-]{6,}$/;
const webUrl = (v) => (v.kind === 'yt' ? `https://www.youtube.com/watch?v=${v.src}` : v.src);

export function createAdminTv(ctx, { rect, onMode, statsSheet }) {
  const tvRef = ref(db, 'admin/config/tv');
  let tv = {}, stop = null, inRoom = false, full = false, shownKey = null, sheetBody = null;

  const content = h('div', { class: 'admscreen-in' });
  const bar = h('div', { class: 'admscreen-bar' },
    h('button', { onclick: () => setFull(false) }, 'Küçült'),
    h('button', { onclick: () => openOutside() }, 'Yeni sekmede aç'));
  const box = h('div', { class: 'admscreen', hidden: true }, content, bar);
  document.getElementById('tvLayer').append(box);

  // Geçiş tuşu: veri ekranı <-> normal TV (kasa tablosunun üstünde)
  const btn = h('button', { class: 'admintvbtn', hidden: true, onclick: toggle });
  document.body.append(btn);

  const mode = () => (tv.mode === 'tv' ? 'tv' : 'stats');
  function openOutside() { if (tv.src) window.open(webUrl(tv), '_blank', 'noopener'); }
  function setFull(on) {
    full = on; box.classList.toggle('full', on);
    document.getElementById('tvLayer').style.zIndex = on ? '40' : ''; // oyunun çubukları sitenin üstünde kalmasın
    place();
  }

  function toggle() {
    const next = mode() === 'tv' ? 'stats' : 'tv';
    update(tvRef, { mode: next }).catch(() => toast(t('Kaydedilemedi. Kurallar güncel mi?')));
    if (next === 'tv' && !tv.src) open();
  }
  function play(raw) {
    const link = parseLink(raw);
    if (!link) return toast(t('Bu link geçerli görünmüyor.'));
    return set(tvRef, { mode: 'tv', kind: link.kind, src: link.src, start: link.start || 0, at: serverTimestamp(), by: ctx.uid })
      .then(() => toast(t('TV\'de açıldı.')))
      .catch(() => toast(t('Kaydedilemedi. Kurallar güncel mi?')));
  }

  /** Ekranın içeriğini kurar; aynı yayın için baştan yüklemez. Geç gelen, yayını kaldığı yerden yakalar. */
  function build() {
    const show = inRoom && mode() === 'tv';
    const key = show ? `${tv.kind}|${tv.src}|${tv.at}` : '';
    box.hidden = !show;
    if (!show && full) setFull(false);
    if (key === shownKey) return;
    shownKey = key;
    content.innerHTML = '';
    if (!show) return;
    if (!tv.src) { content.append(h('p', { class: 'admscreen-idle' }, t('Kanal yok. Kumandadan bir link yapıştır.'))); return; }
    const passed = Math.max(0, Math.floor((now() - (tv.at || now())) / 1000)) + (tv.start || 0);
    if (tv.kind === 'file') {
      const v = h('video', { src: tv.src, autoplay: true, playsInline: true, controls: true });
      v.onloadedmetadata = () => { if (v.duration && passed < v.duration) v.currentTime = passed; };
      content.append(v);
      return;
    }
    const f = document.createElement('iframe');
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    if (tv.kind === 'yt') {
      if (!YT_ID.test(tv.src)) return;
      f.src = `https://www.youtube-nocookie.com/embed/${tv.src}?autoplay=1&playsinline=1&start=${passed}`;
    } else {
      f.referrerPolicy = 'no-referrer'; // YouTube adres ister (yoksa Hata 153), diğer sitelere gönderilmez
      f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
      f.src = tv.src;
    }
    content.append(f);
  }
  function refreshUi() {
    btn.hidden = !inRoom;
    btn.textContent = t(mode() === 'tv' ? 'Veri ekranı' : 'Normal TV');
    onMode(mode());
    build();
    if (sheetBody && document.body.contains(sheetBody)) renderSheet();
  }
  /** Her karede: küçük ekranı odadaki TV'nin üstünde tutar. */
  function place() {
    if (box.hidden) return;
    if (full) { Object.assign(box.style, { left: '0', top: '0', width: '100%', height: '100%' }); return; }
    const r = ctx.game.canvas.getBoundingClientRect(), [x, y, w, hh] = rect;
    Object.assign(box.style, { left: r.left + (x / W) * r.width + 'px', top: r.top + (y / H) * r.height + 'px', width: (w / W) * r.width + 'px', height: (hh / H) * r.height + 'px' });
  }

  // ---------- Kumanda ----------
  function renderSheet() {
    const b = sheetBody;
    b.innerHTML = '';
    const input = h('input', { placeholder: 'Link yapıştır (YouTube, video ya da site)', autocomplete: 'off', enterKeyHint: 'go' });
    b.append(
      h('div', { class: 'tabs' },
        h('button', { class: mode() === 'stats' ? 'sel' : '', onclick: () => mode() === 'stats' || toggle() }, 'Veri ekranı'),
        h('button', { class: mode() === 'tv' ? 'sel' : '', onclick: () => mode() === 'tv' || toggle() }, 'Normal TV')),
      h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (input.value.trim()) play(input.value); } }, input, h('button', { class: 'primary' }, 'Aç')),
    );
    if (tv.src) {
      b.append(h('p', { class: 'small admtv-now' }, document.createTextNode(webUrl(tv))),
        h('div', { class: 'row wrap' },
          h('button', { html: `${icon('full')} ${t('Büyüt')}`, onclick: () => { closeSheet(); if (mode() !== 'tv') update(tvRef, { mode: 'tv' }); setFull(true); } }),
          h('button', { onclick: openOutside }, 'Yeni sekmede aç'),
          h('button', { class: 'link', onclick: () => set(tvRef, { mode: 'tv' }) }, 'Kanalı kapat')));
    }
    b.append(h('p', { class: 'small' }, t('Ekran odadaki herkeste aynıdır. Bazı siteler başka bir sitenin içinde açılmayı engeller; ekran boş kalırsa "Yeni sekmede aç"a bas.')));
    if (mode() === 'stats') statsSheet(b);
  }
  function open() {
    sheetBody = openSheet({ title: 'TV', iconName: 'tv', wide: true, onClose: () => (sheetBody = null) });
    renderSheet();
  }

  function onScene(scene) {
    inRoom = scene === 'admin';
    if (inRoom && !stop) stop = onValue(tvRef, (s) => { tv = s.val() || {}; refreshUi(); }, () => {});
    if (!inRoom) { stop?.(); stop = null; }
    refreshUi();
  }
  function destroy() { stop?.(); box.remove(); btn.remove(); }
  return { onScene, open, place, mode, destroy };
}
