// Değerlendirme kartı: nadiren, rahatsız etmeden. Yıldız seçilince Google Play'deki yorum sayfası açılır; yorum Play'e yazılır, bizim veritabanımıza değil.
// Koşullar: en az 3 farklı günde kullanım, ilk günden 2 gün sonrası, odada 5 dk, açık pencere yok; "Sonra" ile 14 gün susar,
// en çok 3 kez sorulur, "Bir daha sorma" ya da Play'e gidince bir daha çıkmaz. Yıldıza göre ayrım yapılmaz (Play politikası).
import { h, icon } from '../ui.js';
import { t } from '../i18n.js';
import { inApp, PLAY_URL } from './app.js';

const KEY = 'lr.rate', DAY = 864e5;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* özel pencere */ } };

export function createRate() {
  const s = load();
  const t0 = Date.now(), today = new Date(t0).toISOString().slice(0, 10);
  if (!s.first) s.first = t0;
  if (s.day !== today) { s.day = today; s.days = (s.days || 0) + 1; }
  save(s);
  let card = null, timer = null;

  const due = () => !s.done && !s.never && (s.shown || 0) < 3 && (s.days || 0) >= 3 && t0 - s.first >= 2 * DAY && t0 - (s.last || 0) >= 14 * DAY;
  const busy = () => !!document.querySelector('.modal:not([hidden]), .chatpanel:not([hidden])') || document.body.classList.contains('cinema');
  const close = () => { card?.remove(); card = null; };
  const later = () => { s.last = Date.now(); s.shown = (s.shown || 0) + 1; save(s); close(); };
  const never = () => { s.never = true; save(s); close(); };
  const toPlay = () => { s.done = true; save(s); close(); if (inApp()) location.href = PLAY_URL; else window.open(PLAY_URL, '_blank', 'noopener'); };

  function show() {
    if (card) return;
    let stars = 0;
    const btns = [1, 2, 3, 4, 5].map((n) => h('button', { class: 'star', 'aria-label': t('{n} yıldız', { n }), html: icon('star'), onclick: () => { stars = n; btns.forEach((b, i) => b.classList.toggle('on', i < stars)); go.hidden = false; } }));
    const go = h('button', { class: 'primary', hidden: true, onclick: toPlay }, t('Play\'de yorum yap'));
    card = h('div', { class: 'ratecard', role: 'dialog' },
      h('button', { class: 'xclose', title: t('Kapat'), 'aria-label': t('Kapat'), html: icon('close'), onclick: later }),
      h('div', { class: 'ratebody' },
        h('b', {}, t('Get Love Room\'u beğendin mi?')),
        h('span', { class: 'small' }, t('Yıldızını seç, yorumunu Google Play\'de paylaş.')),
        h('div', { class: 'ratestars' }, ...btns), go,
        h('button', { class: 'link', onclick: never }, t('Bir daha sorma'))));
    document.body.append(card);
  }

  function tick() {
    if (!due()) return;
    if (busy()) { timer = setTimeout(tick, 60_000); return; }
    show();
  }
  return {
    start() {
      if (new URLSearchParams(location.search).has('rate')) { setTimeout(show, 1500); return; } // ön izleme
      // Play sayfası kapalı testte yalnızca test kullanıcılarına açık: şimdilik kart yalnızca uygulamayı kuranlara çıkar
      if (inApp() && due()) timer = setTimeout(tick, 5 * 60_000);
    },
    show,
    stop() { clearTimeout(timer); close(); },
  };
}
