// Sürpriz mektup: biriniz partnerine mektup yazar, açılacağı günü seçer; partner o gün (ya da sonra) eve girince
// ekranına zarf düşer, açınca mektup seçilen kâğıt, çiçek ve yazı tipiyle görünür. Yazan, partnerin okuduğunu görür.
//
// live/{rid}/surprise/{id} = { by, to, name, text, openAt (günün başı, ms), paper, flower, font, at, seen? }
import { h, icon, toast, fmtDate } from '../ui.js';
import { push, remove, serverTimestamp, update, now } from '../fb.js';
import { t } from '../i18n.js';

export const PAPERS = {
  krem: { name: 'Krem', bg: '#fff6e0', ink: '#5a3420', line: '#f0dcb4' },
  pembe: { name: 'Pembe', bg: '#ffe6ee', ink: '#7a2140', line: '#ffc4d6' },
  lavanta: { name: 'Lavanta', bg: '#efe8ff', ink: '#3d2b6b', line: '#d8cbff' },
  mavi: { name: 'Gökyüzü', bg: '#e4f2ff', ink: '#1f3d66', line: '#c4def7' },
  gece: { name: 'Gece', bg: '#22264a', ink: '#f6ecc9', line: '#353a6a' },
};
export const FONTS = {
  el: { name: 'El yazısı', css: "'Dancing Script', cursive", size: 26 },
  not: { name: 'Not defteri', css: "'Caveat', cursive", size: 26 },
  zarif: { name: 'Zarif', css: "'Playfair Display', serif", size: 19, italic: true },
  yuvarlak: { name: 'Yuvarlak', css: "'Comfortaa', sans-serif", size: 17 },
  piksel: { name: 'Piksel', css: "'Pixelify Sans', monospace", size: 18 },
};
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Comfortaa:wght@500&family=Dancing+Script:wght@600&family=Playfair+Display:ital@1&display=swap';

// Piksel çiçekler (7x9): r/R gül, w papatya, p/P lale, v lavanta, y ayçiçeği, g sap, b ayçiçeği göbeği
const COLORS = { w: '#ffffff', y: '#ffc93c', g: '#4fbf6a', G: '#2f8f4a', r: '#e0473f', R: '#a8262a', p: '#ff7aa8', P: '#d94a82', v: '#9b7ae0', V: '#6f4fc0', b: '#6b3d1f' };
const FLOWER_MAPS = {
  gul: ['..rrr..', '.rRrRr.', '.rrRrr.', '..rrr..', '...g...', '.gg....', '...gG..', '...g...', '...g...'],
  papatya: ['..w.w..', '.wwwww.', 'wwyyyww', '.wwyww.', '..w.w..', '...g...', '.g.g...', '..gG...', '...g...'],
  lale: ['.p.p.p.', '.ppppp.', '.pPpPp.', '..ppp..', '...g...', '.g.g.g.', '..gGg..', '...g...', '...g...'],
  lavanta: ['..v....', '.vVv...', '..vv.v.', '.vVvVv.', '..vv.vv', '...g.v.', '..g.g..', '...G...', '...g...'],
  aycicegi: ['.y.y.y.', 'yyyyyyy', 'yybbbyy', 'yybbbyy', 'yyyyyyy', '.y.g.y.', '...g...', '.gGg...', '...g...'],
};
export const FLOWERS = { yok: 'Çiçeksiz', gul: 'Gül', papatya: 'Papatya', lale: 'Lale', lavanta: 'Lavanta', aycicegi: 'Ayçiçeği' };
const flowerCache = {};
function flowerImg(kind) {
  if (flowerCache[kind]) return flowerCache[kind];
  const m = FLOWER_MAPS[kind], k = 4;
  const c = document.createElement('canvas'); c.width = 7 * k; c.height = 9 * k;
  const g = c.getContext('2d');
  m.forEach((row, y) => [...row].forEach((ch, x) => { if (COLORS[ch]) { g.fillStyle = COLORS[ch]; g.fillRect(x * k, y * k, k, k); } }));
  return (flowerCache[kind] = c.toDataURL());
}

let fontsLoaded = false;
function loadFonts() {
  if (fontsLoaded) return;
  fontsLoaded = true;
  document.head.append(h('link', { rel: 'stylesheet', href: FONT_LINK }));
}

/** Mektup kâğıdı: tema, köşelerde çiçek demeti, yazı tipi. Metin ve isim kullanıcı yazısıdır: çevrilmez. */
export function letterCard({ text, name, paper = 'krem', flower = 'gul', font = 'el', openAt }) {
  loadFonts();
  const P = PAPERS[paper] || PAPERS.krem, F = FONTS[font] || FONTS.el;
  const card = h('div', { class: 'sletter' });
  Object.assign(card.style, { background: `repeating-linear-gradient(${P.bg} 0 31px, ${P.line} 31px 32px)`, color: P.ink });
  if (FLOWER_MAPS[flower]) {
    const src = flowerImg(flower);
    for (const cls of ['tl', 'br']) card.append(h('div', { class: `bouquet ${cls}` }, ...[0, 1, 2].map(() => h('img', { src, alt: '' }))));
  }
  const body = h('p', { class: 'stext' });
  body.textContent = text;
  Object.assign(body.style, { fontFamily: F.css, fontSize: `${F.size}px`, fontStyle: F.italic ? 'italic' : 'normal' });
  const sign = h('p', { class: 'ssign' });
  sign.textContent = `— ${name || ''}`;
  sign.style.fontFamily = F.css;
  card.append(body, sign);
  if (openAt) card.append(h('small', { class: 'sdate' }, fmtDate(openAt)));
  return card;
}

export function createSurprise(ctx) {
  const { live, uid } = ctx;
  let all = {}, queue = [], showing = false;
  const prevSeen = {};

  const today = () => { const d = new Date(now()); d.setHours(0, 0, 0, 0); return d.getTime(); };

  live.on('surprise', (v) => {
    all = v || {};
    // Yazan taraf: partner mektubu okuyunca haber ver
    for (const [id, x] of Object.entries(all)) {
      if (x.by === uid && x.seen && prevSeen[id] === null) toast(t('{name} sürpriz mektubunu okudu', { name: ctx.partnerName() }), 5000);
      prevSeen[id] = x.seen || null;
    }
    check();
  });
  // Gece yarısı tarih değişince de bak
  setInterval(check, 60_000);

  /** Bana gelen, günü gelmiş, okunmamış mektuplar: sırayla zarf olarak gösterilir. */
  function check() {
    if (showing || document.visibilityState !== 'visible') return;
    queue = Object.entries(all).filter(([, x]) => x.to === uid && !x.seen && x.openAt <= now()).sort((a, b) => a[1].openAt - b[1].openAt);
    if (queue.length) setTimeout(() => showNext(), 1200);
  }
  document.addEventListener('visibilitychange', check);

  function showNext() {
    if (showing || !queue.length) return;
    const [id, x] = queue.shift();
    showing = true;
    loadFonts();
    const close = () => { wrap.remove(); showing = false; update(live.ref(`surprise/${id}`), { seen: serverTimestamp() }).catch(() => {}); setTimeout(check, 400); };
    const env = h('div', { class: 'envelope' }, h('div', { class: 'flap' }), h('div', { class: 'seal', html: icon('heart') }));
    const from = h('p', { class: 'sfrom' }, t('{name} sana bir mektup bıraktı', { name: x.name || ctx.partnerName() }));
    const openBtn = h('button', { class: 'primary' }, 'Mektubu aç');
    const stage = h('div', { class: 'sstage' }, env, from, openBtn);
    const wrap = h('div', { class: 'modal surprise' }, stage);
    openBtn.onclick = () => {
      env.classList.add('open');
      setTimeout(() => {
        stage.innerHTML = '';
        stage.append(letterCard(x), h('button', { class: 'primary', onclick: close }, 'Kapat'));
        stage.classList.add('read');
      }, 650);
    };
    document.body.append(wrap);
  }

  /** Günlük penceresindeki "Sürpriz mektup" sekmesi: yazma, önizleme, gönderdiklerim, bana gelenler. */
  function editor(body) {
    loadFonts();
    const pu = ctx.partnerUid();
    if (!pu) { body.append(h('p', { class: 'small' }, 'Sürpriz mektup partnerine gider. Önce partnerini davet et.')); return; }
    const st = { paper: 'krem', flower: 'gul', font: 'el' };
    const text = h('textarea', { rows: 5, maxLength: 1500, placeholder: t('{name} için bir mektup yaz…', { name: ctx.partnerName() }) });
    const yr = new Date(now()).getFullYear();
    const d0 = new Date(now()), iso = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
    const date = ctx.datePicker(iso, { from: yr, to: yr + 5 });
    const preview = h('div', { class: 'spreview' });
    const draw = () => { preview.innerHTML = ''; preview.append(letterCard({ text: text.value || t('Mektubun burada görünecek.'), name: ctx.myName(), ...st })); };
    text.oninput = draw;
    const chips = (items, key, label) => h('div', { class: 'field' }, h('b', {}, label), h('div', { class: 'aichips' }, ...Object.entries(items).map(([k, v]) => {
      const b = h('button', { class: st[key] === k ? 'on' : '', onclick: () => { st[key] = k; b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); draw(); } }, v.name || v);
      return b;
    })));
    const send = h('button', { class: 'primary', html: `${icon('send')} ${t('Sürprizi bırak')}`, onclick: async () => {
      const msg = text.value.trim();
      if (!msg) return text.focus();
      const day = ctx.parseDay(date.value);
      if (!day) return toast(t('Açılış gününü seç'));
      if (day < today()) return toast(t('Geçmiş bir gün seçilemez'));
      send.disabled = true;
      await push(live.ref('surprise'), { by: uid, to: pu, name: ctx.myName(), text: msg, openAt: day, ...st, at: serverTimestamp() });
      toast(day === today() ? t('Mektup bırakıldı. {name} eve girince görecek.', { name: ctx.partnerName() }) : t('Mektup bırakıldı. {date} günü açılacak.', { date: fmtDate(day) }), 4500);
      text.value = ''; send.disabled = false; draw();
    } });
    const lists = h('div', { class: 'slists' });
    const renderLists = () => {
      lists.innerHTML = '';
      const items = Object.entries(all).sort((a, b) => b[1].openAt - a[1].openAt);
      const sent = items.filter(([, x]) => x.by === uid);
      const got = items.filter(([, x]) => x.to === uid && x.openAt <= now() && x.seen);
      if (got.length) {
        lists.append(h('b', {}, 'Sana gelenler'));
        got.forEach(([, x]) => lists.append(h('button', { class: 'srow', onclick: () => { queue = []; showing = false; const w = h('div', { class: 'modal surprise' }, h('div', { class: 'sstage read' }, letterCard(x), h('button', { class: 'primary', onclick: () => w.remove() }, 'Kapat'))); document.body.append(w); } },
          h('span', {}, t('{name} · {date}', { name: x.name || '', date: fmtDate(x.openAt) })), h('small', {}, 'Oku'))));
      }
      if (sent.length) {
        lists.append(h('b', {}, 'Gönderdiklerin'));
        sent.forEach(([id, x]) => lists.append(h('div', { class: 'srow' },
          h('span', {}, `${fmtDate(x.openAt)} · ${t(x.seen ? 'Okundu' : x.openAt <= now() ? 'Eve girmesini bekliyor' : 'Günü bekleniyor')}`),
          !x.seen ? h('button', { class: 'link', onclick: () => confirm(t('Silinsin mi?')) && remove(live.ref(`surprise/${id}`)) }, 'sil') : null)));
      }
    };
    let unsub = null;
    unsub = live.on('surprise', () => { if (document.body.contains(lists)) renderLists(); else unsub?.(); });
    body.append(
      h('p', { class: 'small' }, 'Yalnızca partnerine gider. Seçtiğin gün eve girdiğinde ekranına zarf olarak düşer; o güne kadar göremez.'),
      text,
      h('div', { class: 'field' }, h('b', {}, 'Hangi gün açılsın?'), date),
      chips(PAPERS, 'paper', 'Kâğıt'), chips(FLOWERS, 'flower', 'Çiçekler'), chips(FONTS, 'font', 'Yazı tipi'),
      h('b', {}, 'Önizleme'), preview, send, lists,
    );
    draw(); renderLists();
  }

  return { editor, check };
}
