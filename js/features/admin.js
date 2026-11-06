// Admin odası: şifreyle girilen gizli istatistik odası. TV'de günlük/haftalık sayılar.
//
// Giriş: menünün alt bağlantılarındaki "Bekarlar için" → şifre. Şifre kodda değil, veritabanı kurallarındadır:
// admins/{uid} yalnızca doğru şifre yazılırsa kabul edilir. Şifreyi bilen herkes admin olabilir.
// Tek ortak oda: şifreyi giren herkes aynı admin odasında buluşur (her çiftin evinden girilir ama konumlar ortaktır).
//   admin/presence/{uid} = { x, y, dir, moving, seat, name, look, side, ts }   odadaki adminler (çıkınca/kopunca silinir)
//   admin/chat/{id}      = { by, name, text, at }   admin sohbeti (sohbet paneli odadayken buraya yazar)
//   Ses: adminvoice.js (odadaki adminler birbirine doğrudan bağlanır)
// Sayaçlar (her kullanıcı kendi kaydını yazar, yalnızca adminler okur):
//   metrics/active/{YYYY-MM-DD}/{uid} = true   o gün evine giren kullanıcılar (UTC günü)
//   metrics/online/{uid} = zaman               son 2 dakikada görülenler = şu an çevrimiçi
import { h, openSheet, toast, loadImg } from '../ui.js';
import { db, get, ref, set, remove, push, onValue, onChildAdded, onDisconnect, query, limitToLast, serverTimestamp, now } from '../fb.js';
import { createRoulette } from './roulette.js';
import { createMatches } from './matches.js';
import { createAdminVoice } from './adminvoice.js';
import { createAdminTv } from './admintv.js';
import { createPoolBets } from './poolbet.js';
import { createHorses } from './horses.js';
import { t, locale } from '../i18n.js';
import { ADMIN_SCENES, SCENES, layout } from '../scenes.js';
import { createMeyhane } from './meyhane.js';

const DAY = 86_400_000;
const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);
export const TV_RECT = [40, 6, 112, 40];
const SIGN_RECT = [4, 8, 28, 36]; // TV'nin solundaki Eclip tabelası
const MEY_SIGN = [75, 5, 46, 16]; // meyhanenin tabelası

/** Her kullanıcı için: bugün aktif + çevrimiçi kaydı (kurallar yoksa sessizce geçer). */
export function trackActivity(uid) {
  const ping = () => {
    if (document.visibilityState !== 'visible') return;
    set(ref(db, `metrics/active/${dayKey(now())}/${uid}`), true).catch(() => {});
    set(ref(db, `metrics/online/${uid}`), serverTimestamp()).catch(() => {});
  };
  ping();
  return setInterval(ping, 60_000);
}

/** TV görüntüsü: sunucu konsolu. Siyah zemin, yeşil tek aralıklı yazı, birkaç sade satır ve son 7 günün çubukları. */
export function statsScreen(s) {
  const c = h('canvas', { width: 896, height: 320 }), g = c.getContext('2d');
  const GREEN = '#39ff88', DIM = '#1f7a4a', AMBER = '#ffcf5a', F = '"Pixelify Sans", monospace';
  g.fillStyle = '#020604'; g.fillRect(0, 0, 896, 320);
  for (let y = 0; y < 320; y += 4) { g.fillStyle = 'rgba(57,255,136,0.035)'; g.fillRect(0, y, 896, 2); } // tarama çizgileri
  g.textAlign = 'left'; g.font = `600 22px ${F}`; g.fillStyle = GREEN;
  g.fillText('GLR-SRV-01  //  ' + t('sistem durumu'), 28, 40);
  g.fillStyle = DIM; g.textAlign = 'right'; g.font = `18px ${F}`; g.fillText(new Date(s.at).toLocaleString(locale), 868, 40);
  g.fillStyle = DIM; g.fillRect(28, 54, 840, 2);
  const line = (y, label, val, col = GREEN) => {
    g.textAlign = 'left'; g.font = `20px ${F}`; g.fillStyle = DIM; g.fillText('> ' + label, 28, y);
    const w = g.measureText('> ' + label).width;
    g.fillText('.'.repeat(Math.max(2, Math.floor((330 - w) / 7))), 36 + w, y);
    g.textAlign = 'right'; g.font = `700 24px ${F}`; g.fillStyle = col; g.fillText(String(val), 420, y);
  };
  line(92, t('çevrimiçi'), s.online, AMBER);
  line(128, t('bugün aktif'), s.activeToday);
  line(164, t('hafta aktif'), s.activeWeek);
  line(200, t('çift / oda'), `${s.couples} / ${s.rooms}`);
  line(236, t('kullanıcı'), s.users);
  line(272, t('yeni bugün'), `+${s.usersToday} / +${s.roomsToday}`);
  // Sağ: son 7 gün, yalnızca çubuklar
  g.textAlign = 'left'; g.font = `18px ${F}`; g.fillStyle = DIM; g.fillText(t('aktif · son 7 gün'), 480, 92);
  const max = Math.max(1, ...s.perDay.map(([, v]) => v));
  s.perDay.forEach(([d, v], i) => {
    const x = 480 + i * 56, bh = Math.max(2, Math.round((v / max) * 150));
    g.fillStyle = i === 6 ? AMBER : GREEN; g.globalAlpha = i === 6 ? 1 : 0.75; g.fillRect(x, 270 - bh, 36, bh); g.globalAlpha = 1;
    g.fillStyle = DIM; g.font = `14px ${F}`; g.textAlign = 'center'; g.fillText(d.slice(8), x + 18, 292);
  });
  g.fillStyle = GREEN; g.fillRect(28, 296, 12, 4); // imleç
  return c.toDataURL('image/png');
}

export function createAdmin(ctx) {
  const { uid } = ctx;
  let timer = null, last = null;
  const api = {};
  const roulette = createRoulette(ctx);
  const poolBets = createPoolBets(ctx);
  const horses = createHorses(ctx);
  const matches = createMatches();
  const voice = createAdminVoice(ctx);
  const meyhane = createMeyhane(ctx);
  const said = {}; // uid -> { text, until } başın üstündeki sohbet balonu
  let stopChat = null;

  // ---------- Ortak oda: diğer adminlerin konumu ----------
  function meRef_() { return ref(db, `admin/presence/${uid}`); }
  const meRef = meRef_();
  let others = {}, stopPres = null, stopConn = null, sendTimer = null, freshTimer = null, lastSent = '', lastBeat = 0;
  // Hayalet kalmasın: kopunca silme kaydı yalnızca bir kez çalışır, bu yüzden her bağlanışta yenilenir. Yine de kalan
  // bir kayıt olursa (20 sn'de bir yenilenir) 90 sn'den eski olanlar odada gösterilmez.
  const FRESH = 90_000, BEAT = 20_000;
  const isFresh = (p) => typeof p?.ts === 'number' && now() - p.ts < FRESH;
  const freshIds = () => Object.keys(others).filter((id) => isFresh(others[id]));
  remove(meRef_()).catch(() => {}); // önceki oturumdan kalan kendi kaydım (admin değilse izin hatası, sorun değil)
  const shown = new Map(); // uid -> yumuşatılmış konum
  function startPresence() {
    stopPres?.();
    stopConn?.();
    stopConn = onValue(ref(db, '.info/connected'), (s) => {
      if (!s.val()) return;
      onDisconnect(meRef).remove().catch(() => {});
      lastSent = ''; // bağlantı geldi: konumu yeniden yaz
    });
    stopPres = onValue(ref(db, 'admin/presence'), (sn) => {
      others = sn.val() || {}; delete others[uid];
      voice.sync(freshIds()); // partnerin sesi kısık bağlanır (evdeki aramadan duyuluyor), yansıtmayı o da görsün
    }, () => {});
    voice.join();
    const since = now();
    stopChat = onChildAdded(query(ref(db, 'admin/chat'), limitToLast(30)), (s) => {
      const m = s.val(); if (!m?.text) return;
      ctx.chat?.adminMessage(m);
      if ((m.at || 0) < since - 2000) return;
      if (m.by === uid) ctx.game.say('me', m.text); else said[m.by] = { text: m.text, until: performance.now() + 6000 };
    }, () => {});
    const send = () => {
      const m = ctx.game.me;
      if (!ADMIN_SCENES.has(m.scene)) return;
      const pose = m.seat >= 0 ? layout(SCENES[m.scene]).seats[m.seat]?.pose || 'sit' : null;
      const p = { scene: m.scene, pose, x: Math.round(m.x), y: Math.round(m.y), dir: m.dir, moving: !!m.moving, seat: m.seat, name: ctx.myName(), look: ctx.myLook(), side: ctx.mySide(), cam: !!ctx.call?.camStream };
      const key = JSON.stringify(p);
      if (key !== lastSent || Date.now() - lastBeat > BEAT) { lastSent = key; lastBeat = Date.now(); set(meRef, { ...p, ts: serverTimestamp() }).catch(() => {}); }
    };
    sendTimer = setInterval(send, 120);
    freshTimer = setInterval(() => voice.sync(freshIds()), 5000); // kayıt eskiyince sesi de kes
  }
  function stopPresence() {
    clearInterval(sendTimer); sendTimer = null; clearInterval(freshTimer); freshTimer = null;
    stopConn?.(); stopConn = null; stopPres?.(); stopPres = null; others = {}; shown.clear(); lastSent = '';
    stopChat?.(); stopChat = null; voice.leave();
    onDisconnect(meRef).cancel().catch(() => {});
    return remove(meRef).catch(() => {});
  }
  // Sayfa kapanırken kaydı hemen sil (geri dönülürse bağlantı yenilenince yeniden yazılır)
  addEventListener('pagehide', () => { if (stopPres) { remove(meRef).catch(() => {}); lastSent = ''; } });
  /** Oyunun her karede çizdiği ek karakterler: odadaki diğer adminler (partner zaten kendi kanalından çizilir). */
  let lastT = performance.now();
  function extras() {
    const n = performance.now(), dt = Math.min(0.1, (n - lastT) / 1000); lastT = n;
    const out = [];
    if (stopPres) out.push(meyhane.tick(Object.fromEntries(Object.entries(others).filter(([, p]) => isFresh(p))))); // garson ve kadehler
    for (const [id, p] of Object.entries(others)) {
      if (!p || id === ctx.partnerUid() || !isFresh(p)) continue;
      let q = shown.get(id);
      if (!q || Math.hypot(q.x - p.x, q.y - p.y) > 60) { q = { x: p.x, y: p.y, t: 0 }; shown.set(id, q); }
      q.x += (p.x - q.x) * Math.min(1, dt * 10); q.y += (p.y - q.y) * Math.min(1, dt * 10);
      if (p.moving) q.t += dt;
      const seat = p.seat >= 0, pose = seat ? p.pose || 'back' : null; // eski sürümler duruş göndermez: admin koltuğu
      const sp = said[id] && said[id].until > n ? said[id].text : null;
      out.push({ id, scene: p.scene || 'admin', x: q.x, y: q.y, t: q.t, dir: p.dir, moving: p.moving && !seat, pose, look: p.look, side: p.side, name: p.name, say: sp, talking: voice.talking(id), cam: p.cam ? voice.camBubble(id) : null, crown: api.leader() === id });
    }
    return out;
  }

  async function login(given) {
    // Büyük/küçük harf fark etmez: kurallardaki şifre küçük harfle yazılı, girileni de küçültüp gönderiyoruz
    const pw = (given || prompt(t('Şifre?')) || '').trim().toLocaleLowerCase('tr-TR');
    if (!pw) return false;
    try { await set(ref(db, `admins/${uid}`), pw); return true; }
    catch { toast(t('Şifre yanlış')); return false; }
  }

  async function stats() {
    const [users, rooms, active, online] = await Promise.all(['users', 'rooms', 'metrics/active', 'metrics/online'].map((p) => get(ref(db, p)).then((s) => s.val() || {})));
    const n = now(), today = dayKey(n);
    const U = Object.values(users), Rm = Object.values(rooms);
    const since = (ms, d) => ms && n - ms < d * DAY;
    const days = [...Array(7)].map((_, i) => dayKey(n - (6 - i) * DAY));
    const week = new Set(days.flatMap((d) => Object.keys(active[d] || {})));
    return {
      users: U.length,
      usersToday: U.filter((u) => since(u.consent?.at, 1)).length,
      usersWeek: U.filter((u) => since(u.consent?.at, 7)).length,
      rooms: Rm.length,
      couples: Rm.filter((r) => r.b).length,
      roomsToday: Rm.filter((r) => since(r.info?.createdAt, 1)).length,
      roomsWeek: Rm.filter((r) => since(r.info?.createdAt, 7)).length,
      activeToday: Object.keys(active[today] || {}).length,
      activeWeek: week.size,
      online: Object.values(online).filter((ms) => n - ms < 120_000).length,
      perDay: days.map((d) => [d, Object.keys(active[d] || {}).length]),
      at: n,
    };
  }

  // Veri ekranı yalnızca TV veri modundayken duvarda görünür
  const showStats = () => ctx.game.setPicture('admintv', 'admin', TV_RECT, tv.mode() === 'stats' && ctx.game.me.scene === 'admin' ? last : null);
  const tv = createAdminTv(ctx, {
    rect: TV_RECT,
    voice,
    onMode: () => showStats(),
    statsSheet: (b) => b.append(last ? h('img', { class: 'bigphoto', src: last, alt: '' }) : h('p', {}, t('Yükleniyor…')), h('button', { onclick: refresh }, 'Yenile')),
  });
  async function refresh() {
    try { last = statsScreen(await stats()); showStats(); }
    catch (e) { console.warn(e); toast(t('İstatistikler okunamadı. Veritabanı kurallarını güncelledin mi?'), 5000); }
  }
  /** Odaya girince TV dakikada bir yenilenir; çıkınca durur. */
  /** Şirket tabelası: siyah zeminde Eclip logosu, altında adı (marka renkleri). */
  let sign = null;
  async function drawSign() {
    if (sign) return sign;
    const logo = await loadImg('assets/eclip-logo.webp');
    const c = h('canvas', { width: 280, height: 360 }), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 280, 360);
    g.drawImage(logo, 30, 14, 220, 220);
    g.textAlign = 'center'; g.fillStyle = '#fcdf4b'; g.font = '700 50px "Pixelify Sans", monospace'; g.fillText('ECLIP', 140, 286);
    g.fillStyle = '#fff6d8'; g.font = '17px "Pixelify Sans", monospace'; g.fillText('SOFTWARE &', 140, 318); g.fillText('ENTERTAINMENT', 140, 340);
    return (sign = c.toDataURL('image/png'));
  }
  function onScene(scene) {
    clearInterval(timer); timer = null;
    roulette.onScene(scene);
    horses.onScene(scene);
    if (scene === 'admin') poolBets.start(); else poolBets.stop();
    tv.onScene(scene);
    // Admin odası ile meyhane arasında geçerken bağlantı (konum, ses, sohbet) kopmaz
    if (!ADMIN_SCENES.has(scene)) { stopPresence(); ctx.game.setPicture('admintv', 'admin', TV_RECT, null); ctx.game.setPicture('eclipsign', 'admin', SIGN_RECT, null); ctx.game.setPicture('meysign', 'meyhane', MEY_SIGN, null); meyhane.stop(); return; }
    if (!stopPres) startPresence();
    meyhane.start();
    if (scene === 'meyhane') { meySign().then((src) => ctx.game.setPicture('meysign', 'meyhane', MEY_SIGN, src)).catch(() => {}); return; }
    drawSign().then((src) => ctx.game.setPicture('eclipsign', 'admin', SIGN_RECT, src)).catch(() => {});
    refresh(); timer = setInterval(refresh, 60_000);
  }
  /** Meyhane tabelası: koyu ahşap üstünde eski usul altın yazı. */
  let meyS = null;
  async function meySign() {
    if (meyS) return meyS;
    await document.fonts.load('700 40px "Pixelify Sans"').catch(() => {});
    const c = h('canvas', { width: 460, height: 160 }), g = c.getContext('2d');
    g.fillStyle = '#1a0f08'; g.fillRect(0, 0, 460, 160);
    g.strokeStyle = '#c9a36b'; g.lineWidth = 6; g.strokeRect(12, 12, 436, 136);
    g.textAlign = 'center'; g.fillStyle = '#f4d36b'; g.font = '700 74px "Pixelify Sans", monospace'; g.fillText('MEYHANE', 230, 98);
    g.fillStyle = '#c9a36b'; g.font = '24px "Pixelify Sans", monospace'; g.fillText('ESKİ İSTANBUL · 1955', 230, 134);
    return (meyS = c.toDataURL('image/png'));
  }
  /** Masadaki bilgisayar: günün maçları ve bahis oranları (matches.js). */
  const openPc = () => matches.open();
  async function enter(pw) {
    if (!(await login(pw))) return;
    ctx.game.goto('admin', 96, 118);
    toast(t('Admin odası. Evine dönmek için alttaki kapıdan çık.'), 4000);
  }
  const openTv = () => tv.open();

  /** Sohbet paneli admin odasındayken mesajı ortak admin sohbetine yazar. */
  const active = () => !!stopPres;
  const sendChat = (text) => push(ref(db, 'admin/chat'), { by: uid, name: ctx.myName(), text, at: serverTimestamp() });
  Object.assign(api, { enter, onScene, openTv, openPc, extras, active, sendChat, voice, poolBets, openRoulette: () => roulette.open(), openHorses: () => horses.open(), placeTv: () => tv.place(), leader: () => roulette.leader(), leave: () => (stopPres ? stopPresence() : null), stop: () => { stopPresence(); roulette.stop(); tv.destroy(); poolBets.stop(); horses.stop(); } });
  return api;
}
