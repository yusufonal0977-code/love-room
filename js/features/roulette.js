// Admin odasındaki rulet masası (Avrupa ruleti, 0-36) ve kasa tablosu. Sanal fişle oynanır, gerçek para yoktur.
//
// Turlar sunucu saatine bağlıdır, herkes aynı anı görür: her 40 sn'de bir tur = 25 sn bahis, 9 sn çark, 6 sn sonuç.
// Sonuç çark dönmeye başlarken ilk yazan cihazca rastgele seçilir ve bir daha değiştirilemez (önceden bilinemez).
//   admin/coins/{uid}               = { name, coins, season, seasonAt }  her adminin fişi (ilk girişte 1000)
// Sezon: SEASON artırılınca herkesin fişi odaya ilk girişinde 1000'e döner (kurallar herkese yalnızca kendi fişini
// yazdırdığı için sıfırlamayı her admin kendisi yapar); sıfırlanmamış eski puanlar tabloda gösterilmez.
//   admin/roulette/bets/{tur}/{uid} = { <bahis>: miktar, paid }  bahisler; sonuçtan sonra herkes kendi kazancını alır
//   admin/roulette/results/{tur}    = 0-36
import { h, openSheet, toast } from '../ui.js';
import { db, ref, get, set, update, remove, onValue, runTransaction, now } from '../fb.js';
import { t, locale } from '../i18n.js';

const ROUND = 40_000, BET = 25_000, SPIN = 9_000, START = 1000;
const SEASON = 2; // 2026-11-07 ve 2026-11-08: kullanıcının isteğiyle herkesin fişi 1000'e sıfırlandı
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colorOf = (n) => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black');
const COL = { green: '#1f8a4c', red: '#c8323c', black: '#1a1a22' };
const CHIPS = [10, 50, 100, 500];
const fmt = (n) => Math.round(n).toLocaleString(locale);

/** Bahis kazandıysa yatırılanın kaç katı geri döner (yatırılan dahil); kaybettiyse 0. */
function payout(key, n) {
  if (key.startsWith('n')) return +key.slice(1) === n ? 36 : 0;
  if (n === 0) return 0;
  const win = {
    red: RED.has(n), black: !RED.has(n), odd: n % 2 === 1, even: n % 2 === 0, low: n <= 18, high: n >= 19,
    d1: n <= 12, d2: n > 12 && n <= 24, d3: n > 24, c1: n % 3 === 1, c2: n % 3 === 2, c3: n % 3 === 0,
  }[key];
  return win ? (key[0] === 'd' || key[0] === 'c' ? 3 : 2) : 0;
}
const phaseOf = (ms = now()) => {
  const r = Math.floor(ms / ROUND), off = ms - r * ROUND;
  return { r, off, phase: off < BET ? 'bet' : off < BET + SPIN ? 'spin' : 'result' };
};

export function createRoulette(ctx) {
  const { uid } = ctx;
  let coins = {}, bets = {}, results = {}, body = null, raf = 0, chip = 10, inRoom = false, round = -1, seasonAt = 0;
  const current = () => Object.entries(coins).filter(([, v]) => (v?.season || 0) >= SEASON);
  const subs = [];
  const myCoins = () => coins[uid]?.coins ?? 0;

  // Kasa tablosu: admin odasında ekranın köşesinde hep görünür
  const board = h('div', { class: 'casino-board', hidden: true });
  board.onclick = () => board.classList.toggle('collapsed'); // dokununca küçülür, arkasındaki masa görünür
  document.body.append(board);
  function drawBoard() {
    const list = current().map(([id, v]) => ({ id, name: v.name || '?', c: v.coins || 0 })).sort((a, b) => b.c - a.c);
    const ph = phaseOf();
    const last = results[ph.r - 1];
    board.innerHTML = '';
    board.append(...[h('b', {}, t('Kasa')),
      ...list.slice(0, 8).map((x, i) => h('div', { class: 'row' + (x.id === uid ? ' me' : '') }, h('span', {}, `${i + 1}. ${x.name}`), h('span', {}, fmt(x.c)))),
      h('small', {}, ph.phase === 'bet' ? t('Rulet: bahisler açık, {s} sn', { s: Math.ceil((BET - ph.off) / 1000) }) : ph.phase === 'spin' ? t('Rulet: çark dönüyor') : t('Rulet: sonuç {n}', { n: results[ph.r] ?? '…' })),
      last != null && ph.phase === 'bet' ? h('small', {}, t('Son sonuç: {n}', { n: last })) : null].filter(Boolean));
  }

  function watch() {
    if (subs.length) return;
    subs.push(onValue(ref(db, 'admin/coins'), (s) => { coins = s.val() || {}; drawBoard(); render(); }, () => {}));
  }
  function watchRound(r) {
    if (r === round) return;
    round = r;
    subs.splice(1).forEach((u) => u());
    subs.push(onValue(ref(db, `admin/roulette/bets/${r}`), (s) => { bets = s.val() || {}; render(); }, () => {}));
    subs.push(onValue(ref(db, `admin/roulette/results/${r}`), (s) => { if (s.val() != null) results[r] = s.val(); }, () => {}));
    get(ref(db, `admin/roulette/results/${r - 1}`)).then((s) => { if (s.val() != null) results[r - 1] = s.val(); }).catch(() => {});
  }
  async function ensureCoins() {
    const s = await get(ref(db, `admin/coins/${uid}`)).catch(() => null);
    if (!s) return;
    if (!s.exists() || (s.val().season || 0) < SEASON) {
      seasonAt = now();
      await set(ref(db, `admin/coins/${uid}`), { name: ctx.myName(), coins: START, season: SEASON, seasonAt }).catch(() => {});
    } else {
      seasonAt = s.val().seasonAt || 0;
      if (s.val().name !== ctx.myName()) update(ref(db, `admin/coins/${uid}`), { name: ctx.myName() }).catch(() => {});
    }
  }

  // Tur saati: her yarım saniyede bir; sonucu çek, kazancı al, tabloyu yenile
  let tick = null;
  function startTick() {
    clearInterval(tick);
    tick = setInterval(async () => {
      const ph = phaseOf();
      watchRound(ph.r);
      drawBoard();
      if (ph.phase !== 'bet' && results[ph.r] == null) {
        // Sonucu ilk yazan belirler (kurallar ikinci yazmaya izin vermez)
        const pick = crypto.getRandomValues(new Uint32Array(1))[0] % 37;
        runTransaction(ref(db, `admin/roulette/results/${ph.r}`), (v) => (v === null ? pick : undefined)).catch(() => {});
      }
      if (ph.phase === 'result') settle(ph.r);
    }, 500);
  }
  /** Kendi bahislerinin kazancını bir kez alır (son birkaç turu da kontrol eder). */
  const settling = new Set();
  async function settle(r) {
    for (let k = r; k > r - 5; k--) await settleRound(k, r);
  }
  async function settleRound(k, r) {
    if (settling.has(k)) return;
    settling.add(k);
    try {
      const [b, res] = await Promise.all([get(ref(db, `admin/roulette/bets/${k}/${uid}`)), get(ref(db, `admin/roulette/results/${k}`))]);
      const mine = b.val();
      if (mine && !mine.paid && res.val() == null && k < r) { // kimse yokken sonuçlanmamış tur: bahis iade
        const back = staked(mine);
        const tr0 = await runTransaction(ref(db, `admin/roulette/bets/${k}/${uid}/paid`), (v) => (v ? undefined : true));
        if (tr0.committed && back) await runTransaction(ref(db, `admin/coins/${uid}/coins`), (v) => (v || 0) + back);
        return;
      }
      if (!mine || mine.paid || res.val() == null) { if (k >= r) settling.delete(k); return; }
      const n = res.val();
      const win = Object.entries(mine).filter(([key]) => key !== 'paid').reduce((s, [key, amt]) => s + amt * payout(key, n), 0);
      const tr = await runTransaction(ref(db, `admin/roulette/bets/${k}/${uid}/paid`), (v) => (v ? undefined : true));
      if (!tr.committed) return;
      if (win > 0) {
        await runTransaction(ref(db, `admin/coins/${uid}/coins`), (v) => (v || 0) + win);
        if (k === r) toast(t('Kazandın: {n} fiş', { n: fmt(win) }), 3500);
      } else if (k === r) toast(t('Bu tur kaybettin. Sonuç: {n}', { n }), 3000);
    } catch { settling.delete(k); }
  }
  const staked = (mine) => Object.entries(mine || {}).filter(([key]) => key !== 'paid').reduce((s, [, a]) => s + (a || 0), 0);
  /** Odaya girince bir kez: bahis yapıp odadan çıkılan turların kazancını öder (ya da iade eder), eski ödenmiş kayıtları siler. */
  let swept = false;
  async function sweep() {
    if (swept) return;
    swept = true;
    const s = await get(ref(db, 'admin/roulette/bets')).catch(() => null);
    if (!s) { swept = false; return; }
    const r = phaseOf().r;
    for (const [k, byUser] of Object.entries(s.val() || {})) {
      const mine = byUser?.[uid];
      if (!mine || +k >= r) continue;
      if (+k * ROUND < seasonAt) { remove(ref(db, `admin/roulette/bets/${k}/${uid}`)).catch(() => {}); continue; }
      if (mine.paid) { if (+k < r - 5) remove(ref(db, `admin/roulette/bets/${k}/${uid}`)).catch(() => {}); continue; }
      await settleRound(+k, r);
    }
  }

  async function bet(key) {
    const ph = phaseOf();
    if (ph.phase !== 'bet') return toast(t('Bahisler kapandı, bir sonraki turu bekle.'));
    const tr = await runTransaction(ref(db, `admin/coins/${uid}/coins`), (v) => (v == null || v < chip ? undefined : v - chip)).catch(() => null);
    if (!tr?.committed) return toast(t('Yeterli fişin yok.'));
    const amt = chip;
    try { await runTransaction(ref(db, `admin/roulette/bets/${ph.r}/${uid}/${key}`), (v) => (v || 0) + amt); }
    catch (e) { await runTransaction(ref(db, `admin/coins/${uid}/coins`), (v) => (v || 0) + amt).catch(() => {}); throw e; }
  }
  async function undo() {
    const ph = phaseOf();
    if (ph.phase !== 'bet' || !bets[uid]) return;
    let sum = 0;
    const tr = await runTransaction(ref(db, `admin/roulette/bets/${ph.r}/${uid}`), (v) => { sum = v && !v.paid ? staked(v) : 0; return v && !v.paid ? null : undefined; });
    if (tr.committed && sum) await runTransaction(ref(db, `admin/coins/${uid}/coins`), (v) => (v || 0) + sum);
  }

  // ---------- Masa ekranı ----------
  function cell(key, label, cls = '') {
    const amt = bets[uid]?.[key];
    return h('button', { class: `rcell ${cls}`, onclick: () => bet(key) }, h('span', {}, label), amt ? h('i', { class: 'rchip' }, fmt(amt)) : null);
  }
  function render() {
    if (!body || !document.body.contains(body)) return;
    const wheel = body.querySelector('canvas.rwheel');
    body.innerHTML = '';
    const ph = phaseOf();
    const cv = wheel || h('canvas', { class: 'rwheel', width: 260, height: 260 });
    const status = h('p', { class: 'center rstatus' });
    body.append(h('div', { class: 'rtop' }, cv, h('div', { class: 'rinfo' },
      status,
      h('p', {}, t('Fişin: {n}', { n: fmt(myCoins()) })),
      h('div', { class: 'row wrap' }, ...CHIPS.map((c) => h('button', { class: 'rchipbtn' + (c === chip ? ' sel' : ''), onclick: () => { chip = c; render(); } }, String(c)))),
      h('div', { class: 'row wrap' }, h('button', { class: 'link', onclick: undo }, t('Bahislerimi geri al')),
        myCoins() < 10 && !bets[uid] ? h('button', { class: 'link', onclick: () => set(ref(db, `admin/coins/${uid}/coins`), 500) }, t('Fişim bitti: 500 fiş al')) : null),
      h('small', {}, t('Son sonuçlar: {list}', { list: Object.keys(results).sort((a, b) => b - a).slice(0, 8).map((k) => results[k]).join(' · ') || '-' })),
      h('small', {}, t('Bu turun bahisleri: {list}', { list: Object.entries(bets).map(([id, b]) => `${coins[id]?.name || '?'} ${fmt(Object.entries(b).filter(([k]) => k !== 'paid').reduce((s, [, a]) => s + a, 0))}`).join(', ') || '-' })),
    )));
    // Masa: 0 solda, 3 sıra × 12 sütun, sağda sütun bahisleri; altta düzineler ve dış bahisler
    const grid = h('div', { class: 'rtable' });
    grid.append(cell('n0', '0', 'green zero'));
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 12; col++) { const n = col * 3 + (3 - row); grid.append(cell('n' + n, String(n), colorOf(n))); }
      grid.append(cell('c' + (3 - row), '2:1', 'out'));
    }
    const dozens = h('div', { class: 'rrow' }, cell('d1', '1-12', 'out'), cell('d2', '13-24', 'out'), cell('d3', '25-36', 'out'));
    const outs = h('div', { class: 'rrow' }, cell('low', '1-18', 'out'), cell('even', t('Çift'), 'out'), cell('red', t('Kırmızı'), 'red'), cell('black', t('Siyah'), 'black'), cell('odd', t('Tek'), 'out'), cell('high', '19-36', 'out'));
    body.append(grid, dozens, outs, h('p', { class: 'small' }, t('Sayıya 35 katı, renk/tek-çift/yarım 1 katı, düzine ve sütun 2 katı kazandırır. Sanal fişle oynanır; gerçek para yoktur.')));
    tickStatus();
    if (!wheel) loop(cv);
  }
  /** Üstteki durum yazısı (ekran yeniden kurulsa da güncel öğeyi bulur). */
  function tickStatus() {
    const el = body?.querySelector('.rstatus');
    if (!el) return;
    const p = phaseOf();
    el.textContent = p.phase === 'bet' ? t('Bahisler açık: {s} sn', { s: Math.ceil((BET - p.off) / 1000) }) : p.phase === 'spin' ? t('Çark dönüyor…') : t('Sonuç: {n}', { n: results[p.r] ?? '…' });
    body.classList.toggle('closed', p.phase !== 'bet');
  }

  // Çark: bahiste yavaş döner; çark aşamasında hızlanıp yavaşlar, top sonucun cebine düşer; sonuçta öyle kalır
  const ease = (p) => 1 - Math.pow(1 - p, 3);
  function loop(cv) {
    const g = cv.getContext('2d'), C = 130, step = (Math.PI * 2) / 37;
    let lastStatus = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const p = phaseOf(), res = results[p.r];
      if (performance.now() - lastStatus > 250) { lastStatus = performance.now(); tickStatus(); }
      let w = (now() / 9000) % (Math.PI * 2), ball = null;
      if (p.phase !== 'bet') {
        const q = Math.min(1, (p.off - BET) / SPIN), e = ease(q);
        w = e * Math.PI * 6;
        if (res != null) {
          const target = -Math.PI / 2; // top en sonda tepedeki cebe oturur
          const pocket = w + WHEEL.indexOf(res) * step;
          const a = target + (1 - e) * Math.PI * 10;
          w = w + (target - pocket) * e; // sonunda sonucun cebi tam göstergenin altına gelir
          ball = { a, r: 104 - e * 22 };
        } else ball = { a: -(p.off / 120), r: 104 };
      }
      g.clearRect(0, 0, 260, 260);
      g.fillStyle = '#5a3420'; g.beginPath(); g.arc(C, C, 128, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a2214'; g.beginPath(); g.arc(C, C, 112, 0, Math.PI * 2); g.fill();
      WHEEL.forEach((n, i) => {
        const a0 = w + i * step - step / 2;
        g.fillStyle = COL[colorOf(n)]; g.beginPath(); g.moveTo(C, C); g.arc(C, C, 100, a0, a0 + step); g.closePath(); g.fill();
        g.save(); g.translate(C, C); g.rotate(a0 + step / 2); g.fillStyle = '#fff6e8'; g.font = '600 10px "Pixelify Sans", monospace'; g.textAlign = 'center'; g.fillText(String(n), 88, 4); g.restore();
      });
      g.fillStyle = '#c9a36b'; g.beginPath(); g.arc(C, C, 62, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8a5a36'; g.beginPath(); g.arc(C, C, 40, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e0b25a'; g.lineWidth = 4; for (let i = 0; i < 4; i++) { const a = w + i * Math.PI / 2; g.beginPath(); g.moveTo(C, C); g.lineTo(C + Math.cos(a) * 36, C + Math.sin(a) * 36); g.stroke(); }
      g.lineWidth = 1;
      if (ball) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(C + Math.cos(ball.a) * ball.r, C + Math.sin(ball.a) * ball.r, 6, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fcdf4b'; g.beginPath(); g.moveTo(C - 7, 2); g.lineTo(C + 7, 2); g.lineTo(C, 14); g.closePath(); g.fill(); // gösterge
      if (p.phase === 'result' && res != null) {
        g.fillStyle = COL[colorOf(res)]; g.beginPath(); g.arc(C, C, 30, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff6e8'; g.font = '700 26px "Pixelify Sans", monospace'; g.textAlign = 'center'; g.fillText(String(res), C, C + 9);
      }
    };
    frame();
  }

  function open() {
    body = openSheet({ title: 'Rulet', iconName: 'game', wide: true, onClose: () => { cancelAnimationFrame(raf); body = null; } });
    body.classList.add('roulette');
    watch(); watchRound(phaseOf().r); ensureCoins().then(render);
    render();
  }
  function onScene(scene) {
    inRoom = scene === 'admin';
    board.hidden = !inRoom;
    if (inRoom) { watch(); ensureCoins().then(sweep); startTick(); drawBoard(); }
    else { clearInterval(tick); tick = null; }
  }
  function stop() { clearInterval(tick); subs.splice(0).forEach((u) => u()); board.remove(); }
  /** Kasada tek başına en çok fişi olan (odada olmasa da). Eşitlikte taç kimsede olmaz. */
  function leader() {
    const list = current().map(([id, v]) => [id, v?.coins || 0]).sort((a, b) => b[1] - a[1]);
    return list.length && list[0][1] > 0 && (list.length === 1 || list[0][1] > list[1][1]) ? list[0][0] : null;
  }
  return { open, onScene, stop, leader };
}
