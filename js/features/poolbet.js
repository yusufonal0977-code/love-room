// Admin bilardo masasında bahis: sanal fişle ortak havuz, gerçek para yoktur.
//
// Herkes bir oyuncuya yatırır; oyun bitince havuz, kazanana yatıranlara yatırdıkları oranda bölünür.
// Kazanana kimse yatırmadıysa ya da oyun yarıda sıfırlandıysa herkes yatırdığını geri alır.
// Bahis ilk atışa kadar açıktır. Oyuncular yalnızca kendilerine yatırabilir. Herkes kendi kazancını kendisi alır.
//   admin/config/poolbets/{oyun} = { result: kazanan uid | 'void', bets: { uid: { on, amt, name, paid } } }
import { toast } from '../ui.js';
import { db, ref, onValue, remove, runTransaction } from '../fb.js';
import { t, locale } from '../i18n.js';

const fmt = (n) => Math.round(n).toLocaleString(locale);
const DENEME = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('tvdeneme');
const BASE = DENEME ? 'admin/config/poolbetstest' : 'admin/config/poolbets';
const coinRef = (uid) => ref(db, `admin/coins/${uid}/coins`);

/** Havuz durumu: her oyuncuya yatırılan toplam ve genel toplam. */
export function totals(node) {
  const by = {}; let pot = 0;
  for (const b of Object.values(node?.bets || {})) { by[b.on] = (by[b.on] || 0) + (b.amt || 0); pot += b.amt || 0; }
  return { by, pot };
}
/** Bahsin geri dönüşü: kazanan biliniyorsa havuzdaki pay, geçersizse/kazanana yatıran yoksa yatırılan. */
export function payoutOf(node, bet) {
  const { by, pot } = totals(node), r = node?.result;
  if (r === 'void' || !by[r]) return bet.amt;
  return bet.on === r ? Math.floor((bet.amt / by[r]) * pot) : 0;
}

export function createPoolBets(ctx) {
  const { uid } = ctx;
  let data = {}, coins = 0, stops = [], busy = new Set(), listener = null;

  function settle() {
    for (const [gid, node] of Object.entries(data)) {
      const mine = node?.bets?.[uid];
      if (node?.result && mine && !mine.paid && !busy.has(gid)) pay(gid, node, mine);
    }
  }
  async function pay(gid, node, mine) {
    busy.add(gid);
    try {
      const won = payoutOf(node, mine);
      const tr = await runTransaction(ref(db, `${BASE}/${gid}/bets/${uid}/paid`), (v) => (v ? undefined : true));
      if (!tr.committed) return;
      if (won > 0) await runTransaction(coinRef(uid), (v) => (v || 0) + won);
      toast(node.result === 'void' ? t('Oyun iptal oldu, bahsin geri geldi: {n} fiş', { n: fmt(won) })
        : won > mine.amt ? t('Bilardo bahsini kazandın: {n} fiş', { n: fmt(won) })
          : won > 0 ? t('Bahsin geri geldi: {n} fiş', { n: fmt(won) }) : t('Bilardo bahsini kaybettin.'), 4000);
    } catch (e) { console.warn(e); busy.delete(gid); }
  }
  // Herkes kazancını aldıysa eski oyunun kaydı silinir
  function prune() {
    for (const [gid, node] of Object.entries(data)) {
      if (busy.has(gid)) continue; // kendi ödemem: silmek süren işlemi iptal edip fişi kaybettirir
      const list = Object.values(node?.bets || {});
      if (node?.result && list.every((b) => b.paid)) remove(ref(db, `${BASE}/${gid}`)).catch(() => {});
    }
  }

  async function place(gid, on, amt) {
    const cur = data[gid]?.bets?.[uid];
    if (cur && cur.on !== on) return toast(t('Bu oyunda başka bir oyuncuya yatırdın.'));
    const tr = await runTransaction(coinRef(uid), (v) => (v == null || v < amt ? undefined : v - amt)).catch(() => null);
    if (!tr?.committed) return toast(t('Yeterli fişin yok.'));
    await runTransaction(ref(db, `${BASE}/${gid}/bets/${uid}`), (v) => ({ on, amt: (v?.amt || 0) + amt, name: ctx.myName() }));
  }
  /** Oyun bitti ya da sıfırlandı: sonucu bir kez yazar (bahis yoksa kayıt açmaz). */
  function finish(gid, result) {
    if (!gid || !data[gid]) return;
    runTransaction(ref(db, `${BASE}/${gid}/result`), (v) => (v == null ? result : undefined)).catch(() => {});
  }
  function start() {
    if (stops.length) return;
    stops = [
      onValue(ref(db, BASE), (s) => { data = s.val() || {}; settle(); prune(); listener?.(); }, () => {}),
      onValue(coinRef(uid), (s) => { coins = s.val() || 0; listener?.(); }, () => {}),
    ];
  }
  function stop() { stops.forEach((u) => u()); stops = []; }
  return { start, stop, place, finish, node: (gid) => data[gid] || null, coins: () => coins, mine: (gid) => data[gid]?.bets?.[uid] || null, onChange: (f) => { listener = f; } };
}
