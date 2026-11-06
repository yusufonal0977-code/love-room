// Meyhane garsonu: tamamen kendi kendine çalışır. "Rakı tazele" diyen sıraya girer; garson sırayla tezgahtan
// gelip kadehi doldurur ve döner. Garsonu çalıştıran bir cihaz yok: sıra veritabanında ortak, garsonun her an nerede
// olduğu sıradaki isteklerin sunucu saatinden hesaplanır, bu yüzden odadaki herkes aynı garsonu aynı yerde görür.
//   admin/config/meyhane/queue/{id} = { uid, name, seat, at }   bekleyen ve yeni biten istekler (hepsi bitince silinir)
//   admin/config/meyhane/glass/{uid} = zaman                 kadehin son dolduğu an (içildikçe azalır)
import { db, ref, push, remove, set, onValue, serverTimestamp, now } from '../fb.js';
import { h, toast } from '../ui.js';
import { t } from '../i18n.js';
import { DECOR, SCENES, MEY_TABLE, layout } from '../scenes.js';

const HOME = { x: 84, y: 74 }, SPEED = 34, POUR = 3200, DRINK = 240_000; // px/sn, ms, kadehin bitme süresi
const LOOK = { skin: 2, hair: 'short', hairColor: 0, outfit: 'basic', shirt: 0, pants: 0 }; // Garson Birkan

/** Sıradaki isteklerden garsonun zaman çizelgesi: her istek bir önceki bitince başlar. */
export function schedule(queue, seats) {
  let prevEnd = 0;
  return Object.entries(queue || {}).filter(([, e]) => typeof e?.at === 'number' && seats[e.seat])
    .sort((a, b) => a[1].at - b[1].at || (a[0] < b[0] ? -1 : 1))
    .map(([id, e]) => {
      const to = { x: seats[e.seat].x + 14, y: 92 }; // kadehin hemen sağında, masanın arkasında
      const walk = (Math.hypot(to.x - HOME.x, to.y - HOME.y) / SPEED) * 1000;
      const start = Math.max(e.at, prevEnd), arrive = start + walk, poured = arrive + POUR, end = poured + walk;
      prevEnd = end;
      return { id, ...e, to, start, arrive, poured, end };
    });
}
/** Garsonun o anki konumu ve hali. */
export function waiterAt(plan, ms) {
  const job = plan.find((j) => ms >= j.start && ms < j.end);
  if (!job) return { x: HOME.x, y: HOME.y, dir: 'down', moving: false, job: null };
  const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  const side = (a, b) => (Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? (b.x > a.x ? 'right' : 'left') : b.y > a.y ? 'down' : 'up');
  if (ms < job.arrive) return { ...lerp(HOME, job.to, (ms - job.start) / (job.arrive - job.start)), dir: side(HOME, job.to), moving: true, job };
  if (ms < job.poured) return { ...job.to, dir: 'down', moving: false, job, pouring: true, k: (ms - job.arrive) / (job.poured - job.arrive) };
  return { ...lerp(job.to, HOME, (ms - job.poured) / (job.end - job.poured)), dir: side(job.to, HOME), moving: true, job };
}

export function createMeyhane(ctx) {
  const { uid } = ctx;
  const qRef = ref(db, 'admin/config/meyhane/queue'), gRef = ref(db, 'admin/config/meyhane/glass');
  let queue = {}, glass = {}, plan = [], stops = [], walkT = 0, lastF = performance.now();
  const wrote = new Set();
  const seats = () => layout(SCENES.meyhane).seats;

  const btn = h('button', { class: 'meybtn', hidden: true, onclick: order });
  document.body.append(btn);

  function start() {
    if (stops.length) return;
    stops.push(onValue(qRef, (s) => { queue = s.val() || {}; plan = schedule(queue, seats()); }, () => {}));
    stops.push(onValue(gRef, (s) => { glass = s.val() || {}; }, () => {}));
  }
  function stop() { stops.splice(0).forEach((u) => u()); btn.hidden = true; DECOR.meyGlasses = []; DECOR.meyPour = null; }

  const mySeat = () => { const m = ctx.game.me; return m.scene === 'meyhane' && m.seat >= 0 && seats()[m.seat]?.group === 'meyt' ? m.seat : -1; };
  const myJob = (ms) => plan.find((j) => j.uid === uid && ms < j.poured);
  async function order() {
    const seat = mySeat();
    if (seat < 0) return toast(t('Önce masaya otur.'));
    if (myJob(now())) return;
    await push(qRef, { uid, name: ctx.myName(), seat, at: serverTimestamp() }).catch(() => toast(t('Kaydedilemedi. Kurallar güncel mi?')));
  }

  /** Her karede: düğme, kadehler, garsonun yeri; biten işleri kaydeder ve sırayı temizler. */
  function tick(others) {
    const ms = now(), n = performance.now(), dt = Math.min(0.1, (n - lastF) / 1000); lastF = n;
    // Düğme: masada oturanlara
    const seat = mySeat(), job = myJob(ms);
    btn.hidden = seat < 0;
    if (!btn.hidden) {
      const ahead = job ? plan.filter((j) => j.start < job.start && ms < j.poured).length : 0;
      btn.disabled = !!job;
      btn.textContent = !job ? t('Rakı tazele') : ms >= job.start ? t('Garson geliyor') : t('Sıradasın: {n}', { n: ahead + 1 });
    }
    // Kendi kadehim doldu: kaydet (bir kez)
    for (const j of plan) if (j.uid === uid && ms >= j.poured && !wrote.has(j.id)) { wrote.add(j.id); set(ref(db, `admin/config/meyhane/glass/${uid}`), j.poured).catch(() => {}); }
    // Hepsi bittiyse sırayı temizle (zinciri bozmamak için yalnızca tamamı bitince)
    if (plan.length && plan.every((j) => j.end < ms - 20_000)) { remove(qRef).catch(() => {}); plan = []; }
    // Kadehler: masada oturan herkesin önünde
    const list = [];
    const level = (id) => { const ts = glass[id]; return ts ? Math.max(0.12, 1 - (ms - ts) / DRINK) : 0.12; };
    if (seat >= 0) list.push({ x: seats()[seat].x + 8, level: level(uid) });
    for (const [id, p] of Object.entries(others)) if (p?.scene === 'meyhane' && p.seat >= 0 && seats()[p.seat]?.group === 'meyt') list.push({ x: seats()[p.seat].x + 8, level: level(id) });
    // Dolarken kadeh garsonun elinden yavaşça dolar
    const w = waiterAt(plan, ms);
    const gx = w.pouring ? seats()[w.job.seat].x + 8 : 0;
    if (w.pouring) { const g = list.find((x) => x.x === gx); if (g) g.level = Math.max(g.level, w.k); else list.push({ x: gx, level: w.k }); }
    DECOR.meyPour = w.pouring ? { x: gx, k: w.k } : null;
    if (JSON.stringify(list) !== JSON.stringify(DECOR.meyGlasses || [])) DECOR.meyGlasses = list;
    if (w.moving) walkT += dt;
    return { id: 'garson', scene: 'meyhane', x: w.x, y: w.y, t: walkT, dir: w.dir, moving: w.moving, look: LOOK, name: t('Garson Birkan'), noBadge: true,
      say: w.pouring ? t('Buyrun, {name}. Şerefe!', { name: w.job.name || '' }) : null };
  }
  return { start, stop, tick };
}
