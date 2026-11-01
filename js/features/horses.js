// Admin odasında mini at yarışı. Sanal fişle oynanır, gerçek para yoktur.
//
// Yarışlar sunucu saatine bağlıdır, herkes aynı yarışı aynı anda izler: her 45 sn'de bir = 25 sn bahis, 14 sn yarış, 6 sn sonuç.
// Her yarışın atları aynıdır ama güçleri ve oranları o yarışın numarasından türetilir; kazanan güce göre rastgele seçilir.
// Kazananı yarış başlarken ilk yazan cihaz belirler, sonra değişmez. Herkes kendi kazancını kendisi alır.
//   admin/config/horses/results/{yarış} = at no (0-5)
//   admin/config/horses/bets/{yarış}/{uid} = { h0: miktar, ..., paid }
import { h, openSheet, toast } from '../ui.js';
import { db, ref, get, set, remove, onValue, runTransaction, now } from '../fb.js';
import { t, locale } from '../i18n.js';

const ROUND = 45_000, BET = 25_000, RACE = 14_000, CHIPS = [10, 50, 100, 500];
const HORSES = [['Rüzgar', '#c8742c'], ['Yıldız', '#f4efe6'], ['Şimşek', '#fcdf4b'], ['Karayel', '#3a3a48'], ['Fırtına', '#5b8def'], ['Duman', '#9aa3ad']];
const DENEME = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('tvdeneme');
const BASE = DENEME ? 'admin/config/horsestest' : 'admin/config/horses';
const fmt = (n) => Math.round(n).toLocaleString(locale);
const phaseOf = (ms = now()) => { const r = Math.floor(ms / ROUND), off = ms - r * ROUND; return { r, off, phase: off < BET ? 'bet' : off < BET + RACE ? 'race' : 'result' }; };

/** Yarış numarasından tekrarlanabilir rastgele sayı üreticisi: herkeste aynı güçler ve aynı koşu. */
function seeded(n) {
  let a = (n * 2654435761) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
/** Bu yarışın şansları ve oranları (yatırılanın kaç katı döner). */
function raceInfo(r) {
  const rnd = seeded(r), w = HORSES.map(() => 1 + rnd() * 3), sum = w.reduce((a, b) => a + b, 0);
  const p = w.map((x) => x / sum);
  return { p, odds: p.map((x) => Math.max(1.2, Math.round((0.92 / x) * 10) / 10)) };
}
function pickWinner(p) {
  let v = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  for (let i = 0; i < p.length; i++) { v -= p[i]; if (v <= 0) return i; }
  return p.length - 1;
}
/** Atların konumu (0-1): kazanan tam bitişte 1'e varır, diğerleri arkasında kalır; yol boyunca öne geçmeler olur. */
function positions(r, winner, q) {
  const rnd = seeded(r + 7);
  return HORSES.map((_, i) => {
    const end = i === winner ? 1 : 0.76 + rnd() * 0.2, a = 1 + rnd() * 5, b = rnd() * 6, wob = (1 - q) * q * 0.32;
    return Math.max(0, Math.min(1, end * q + Math.sin(q * a * 3 + b) * wob));
  });
}

export function createHorses(ctx) {
  const { uid } = ctx;
  let body = null, raf = 0, tick = null, chip = 50, round = -1, stopRound = [], coins = 0, stopCoins = null;
  let bets = {}, results = {};
  const coinRef = () => ref(db, `admin/coins/${uid}/coins`);
  const settled = new Set();

  function watchRound(r) {
    if (r === round) return;
    round = r;
    stopRound.forEach((u) => u());
    stopRound = [
      onValue(ref(db, `${BASE}/bets/${r}`), (s) => { bets = s.val() || {}; render(); }, () => {}),
      onValue(ref(db, `${BASE}/results/${r}`), (s) => { if (s.val() != null) results[r] = s.val(); }, () => {}),
    ];
    get(ref(db, `${BASE}/results/${r - 1}`)).then((s) => { if (s.val() != null) results[r - 1] = s.val(); }).catch(() => {});
    if (r % 20 === 0) prune(r);
  }
  // Eski yarışların kaydı silinir (son 30 yarış kalır)
  async function prune(r) {
    for (const part of ['bets', 'results']) {
      const s = await get(ref(db, `${BASE}/${part}`)).catch(() => null);
      Object.keys(s?.val() || {}).filter((k) => +k < r - 30).forEach((k) => remove(ref(db, `${BASE}/${part}/${k}`)).catch(() => {}));
    }
  }
  /** Kendi bahislerinin kazancını bir kez alır; kimse yokken sonuçlanmayan yarışta bahis iade edilir. */
  async function settle(r) {
    for (let k = r; k > r - 5; k--) {
      if (settled.has(k)) continue;
      settled.add(k);
      try {
        const [b, res] = await Promise.all([get(ref(db, `${BASE}/bets/${k}/${uid}`)), get(ref(db, `${BASE}/results/${k}`))]);
        const mine = b.val(), n = res.val();
        const entries = Object.entries(mine || {}).filter(([key]) => key !== 'paid');
        if (!mine || mine.paid) { if (k === r && n == null) settled.delete(k); continue; }
        if (n == null && k === r) { settled.delete(k); continue; }
        const odds = raceInfo(k).odds;
        const won = n == null ? entries.reduce((s, [, a]) => s + a, 0) : Math.floor((mine[`h${n}`] || 0) * odds[n]);
        const tr = await runTransaction(ref(db, `${BASE}/bets/${k}/${uid}/paid`), (v) => (v ? undefined : true));
        if (!tr.committed) continue;
        if (won > 0) await runTransaction(coinRef(), (v) => (v || 0) + won);
        if (k === r) toast(won > 0 ? t('{name} kazandı. Kazancın: {n} fiş', { name: HORSES[n][0], n: fmt(won) }) : t('{name} kazandı. Bu yarışı kaybettin.', { name: HORSES[n][0] }), 4000);
      } catch { settled.delete(k); }
    }
  }
  function startTick() {
    clearInterval(tick);
    tick = setInterval(() => {
      const ph = phaseOf();
      watchRound(ph.r);
      if (ph.phase !== 'bet' && results[ph.r] == null) {
        const pick = pickWinner(raceInfo(ph.r).p);
        runTransaction(ref(db, `${BASE}/results/${ph.r}`), (v) => (v === null ? pick : undefined)).catch(() => {});
      }
      if (ph.phase === 'result') settle(ph.r);
    }, 500);
  }
  async function bet(i) {
    const ph = phaseOf();
    if (ph.phase !== 'bet') return toast(t('Bahisler kapandı, bir sonraki turu bekle.'));
    const tr = await runTransaction(coinRef(), (v) => (v == null || v < chip ? undefined : v - chip)).catch(() => null);
    if (!tr?.committed) return toast(t('Yeterli fişin yok.'));
    await runTransaction(ref(db, `${BASE}/bets/${ph.r}/${uid}/h${i}`), (v) => (v || 0) + chip);
  }
  async function undo() {
    const ph = phaseOf(), mine = bets[uid];
    if (ph.phase !== 'bet' || !mine) return;
    const sum = Object.entries(mine).filter(([k]) => k !== 'paid').reduce((s, [, a]) => s + a, 0);
    await remove(ref(db, `${BASE}/bets/${ph.r}/${uid}`));
    await runTransaction(coinRef(), (v) => (v || 0) + sum);
  }

  // ---------- Ekran ----------
  function render() {
    if (!body || !document.body.contains(body)) return;
    const old = body.querySelector('canvas.hrace');
    const cv = old || h('canvas', { class: 'hrace', width: 480, height: 216 });
    const ph = phaseOf(), info = raceInfo(ph.r), mine = bets[uid] || {};
    body.innerHTML = '';
    body.append(cv, h('p', { class: 'center rstatus hstatus' }),
      h('p', { class: 'small center' }, t('Fişin: {n}', { n: fmt(coins) })),
      h('div', { class: 'row wrap hchips' }, ...CHIPS.map((c) => h('button', { class: 'rchipbtn' + (c === chip ? ' sel' : ''), onclick: () => { chip = c; render(); } }, String(c)))),
      h('div', { class: 'hlist' }, ...HORSES.map(([name, col], i) => h('button', { class: 'hrow', onclick: () => bet(i) },
        h('i', { style: { background: col } }), h('span', {}, `${i + 1}. ${name}`), h('small', {}, `${info.odds[i].toFixed(1)}x`),
        mine[`h${i}`] ? h('b', {}, fmt(mine[`h${i}`])) : null))),
      h('div', { class: 'row wrap' }, h('button', { class: 'link', onclick: undo }, 'Bahislerimi geri al')),
      h('p', { class: 'small' }, t('Bu yarışın bahisleri: {list}', { list: Object.entries(bets).map(([id, b]) => `${coinName(id)} ${fmt(Object.entries(b).filter(([k]) => k !== 'paid').reduce((s, [, a]) => s + a, 0))}`).join(', ') || '-' })),
      h('p', { class: 'small' }, t('Atın üstündeki oran, kazanırsa yatırdığının kaç katının döneceğini gösterir. Her yarışta oranlar değişir. Sanal fişle oynanır; gerçek para yoktur.')));
    status();
    if (!old) loop(cv);
  }
  let names = {};
  const coinName = (id) => names[id] || '?';
  function status() {
    const el = body?.querySelector('.hstatus');
    if (!el) return;
    const p = phaseOf(), res = results[p.r];
    el.textContent = p.phase === 'bet' ? t('Bahisler açık: {s} sn', { s: Math.ceil((BET - p.off) / 1000) }) : p.phase === 'race' ? t('Atlar koşuyor…') : res != null ? t('Kazanan: {name}', { name: HORSES[res][0] }) : '…';
    body.classList.toggle('closed', p.phase !== 'bet');
  }
  /** Küçük piksel at: gövde, baş, koşan bacaklar, sırt numarası. */
  function horse(g, x, y, col, num, run) {
    g.fillStyle = col; g.fillRect(x, y, 22, 9); g.fillRect(x + 20, y - 5, 7, 8); g.fillRect(x + 25, y - 3, 4, 4);
    g.fillStyle = '#26160f'; g.fillRect(x + 21, y - 7, 2, 3); g.fillRect(x - 3, y, 3, 6); g.fillRect(x + 26, y - 2, 1, 1);
    const k = Math.floor(run) % 2;
    g.fillStyle = col;
    g.fillRect(x + 2 + (k ? 3 : 0), y + 9, 3, 6); g.fillRect(x + 8 - (k ? 3 : 0), y + 9, 3, 6);
    g.fillRect(x + 14 + (k ? 3 : 0), y + 9, 3, 6); g.fillRect(x + 19 - (k ? 3 : 0), y + 9, 3, 6);
    g.fillStyle = '#e0473f'; g.fillRect(x + 7, y - 1, 8, 6);
    g.fillStyle = '#fff6e8'; g.font = '600 9px "Pixelify Sans", monospace'; g.textAlign = 'center'; g.fillText(String(num), x + 11, y + 4);
  }
  function loop(cv) {
    const g = cv.getContext('2d'), W = 480, H = 216, LANE = 33, LEFT = 12, FIN = 430;
    let last = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const p = phaseOf(), res = results[p.r];
      if (performance.now() - last > 250) { last = performance.now(); status(); }
      const q = p.phase === 'bet' ? 0 : p.phase === 'race' ? Math.min(1, (p.off - BET) / RACE) : 1;
      const pos = res != null ? positions(p.r, res, q) : HORSES.map(() => 0);
      g.fillStyle = '#2f8f5a'; g.fillRect(0, 0, W, H);
      HORSES.forEach((_, i) => { g.fillStyle = i % 2 ? '#c9a36b' : '#b89260'; g.fillRect(0, 8 + i * LANE, W, LANE - 2); });
      for (let y = 8; y < H - 8; y += 8) { g.fillStyle = (y / 8) % 2 ? '#fff6e8' : '#1a1210'; g.fillRect(FIN + 28, y, 8, 8); }
      HORSES.forEach(([, col], i) => horse(g, LEFT + pos[i] * (FIN - LEFT), 20 + i * LANE, col, i + 1, p.phase === 'race' ? now() / 90 : 0));
      if (p.phase === 'result' && res != null) {
        g.fillStyle = 'rgba(2,6,4,.72)'; g.fillRect(90, 82, 300, 52);
        g.fillStyle = '#fcdf4b'; g.font = '700 26px "Pixelify Sans", monospace'; g.textAlign = 'center'; g.fillText(t('Kazanan: {name}', { name: HORSES[res][0] }), 240, 116);
      }
    };
    frame();
  }
  function open() {
    body = openSheet({ title: 'At yarışı', iconName: 'game', wide: true, onClose: () => { cancelAnimationFrame(raf); body = null; } });
    body.classList.add('horses');
    watchRound(phaseOf().r);
    render();
  }
  function onScene(scene) {
    if (scene === 'admin') {
      startTick();
      stopCoins ??= onValue(ref(db, 'admin/coins'), (s) => {
        const all = s.val() || {};
        coins = all[uid]?.coins || 0;
        names = Object.fromEntries(Object.entries(all).map(([id, v]) => [id, v?.name || '?']));
        render();
      }, () => {});
    } else { clearInterval(tick); tick = null; stopCoins?.(); stopCoins = null; }
  }
  function stop() { clearInterval(tick); stopCoins?.(); stopRound.forEach((u) => u()); cancelAnimationFrame(raf); }
  return { open, onScene, stop };
}
