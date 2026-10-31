// Admin odası: şifreyle girilen gizli istatistik odası. TV'de günlük/haftalık sayılar.
//
// Giriş: menünün alt bağlantılarındaki "Bekarlar için" → şifre. Şifre kodda değil, veritabanı kurallarındadır:
// admins/{uid} yalnızca doğru şifre yazılırsa kabul edilir. Şifreyi bilen herkes admin olabilir.
// Sayaçlar (her kullanıcı kendi kaydını yazar, yalnızca adminler okur):
//   metrics/active/{YYYY-MM-DD}/{uid} = true   o gün evine giren kullanıcılar (UTC günü)
//   metrics/online/{uid} = zaman               son 2 dakikada görülenler = şu an çevrimiçi
import { h, openSheet, toast } from '../ui.js';
import { db, get, ref, set, serverTimestamp, now } from '../fb.js';
import { t, locale } from '../i18n.js';

const DAY = 86_400_000;
const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);
export const TV_RECT = [40, 6, 112, 40];

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

/** TV görüntüsü: koyu ekran, büyük sayılar, son 7 günün aktif kullanıcı çubukları. */
export function statsScreen(s) {
  const c = h('canvas', { width: 896, height: 320 }), g = c.getContext('2d');
  g.fillStyle = '#0d1020'; g.fillRect(0, 0, 896, 320);
  g.fillStyle = '#fcdf4b'; g.font = '700 26px "Pixelify Sans", monospace'; g.textAlign = 'left';
  g.fillText('GET LOVE ROOM · ' + t('İstatistik'), 24, 40);
  g.fillStyle = '#8a90b0'; g.font = '18px "Pixelify Sans", monospace'; g.textAlign = 'right';
  g.fillText(new Date(s.at).toLocaleString(locale), 872, 40);
  const box = (x, y, label, val, sub, col) => {
    g.fillStyle = '#171b33'; g.fillRect(x, y, 200, 104);
    g.textAlign = 'left'; g.fillStyle = '#8a90b0'; g.font = '17px "Pixelify Sans", monospace'; g.fillText(label, x + 14, y + 26);
    g.fillStyle = col; g.font = '700 44px "Pixelify Sans", monospace'; g.fillText(String(val), x + 14, y + 72);
    g.fillStyle = '#c8cce0'; g.font = '15px "Pixelify Sans", monospace'; g.fillText(sub, x + 14, y + 94);
  };
  box(24, 62, t('Şu an çevrimiçi'), s.online, t('son 2 dakika'), '#4fbf6a');
  box(236, 62, t('Bugün aktif'), s.activeToday, t('Bu hafta: {n}', { n: s.activeWeek }), '#5ec2ff');
  box(448, 62, t('Odalar'), s.rooms, t('{n} çift · bugün +{d} · hafta +{w}', { n: s.couples, d: s.roomsToday, w: s.roomsWeek }), '#ff7aa3');
  box(660, 62, t('Kullanıcılar'), s.users, t('bugün +{d} · hafta +{w}', { d: s.usersToday, w: s.usersWeek }), '#ffc93c');
  // Son 7 gün: günlük aktif kullanıcı
  g.fillStyle = '#8a90b0'; g.font = '16px "Pixelify Sans", monospace'; g.textAlign = 'left'; g.fillText(t('Son 7 gün · günlük aktif kullanıcı'), 24, 196);
  const max = Math.max(1, ...s.perDay.map(([, v]) => v));
  s.perDay.forEach(([d, v], i) => {
    const x = 24 + i * 122, bh = Math.round((v / max) * 80);
    g.fillStyle = i === 6 ? '#fcdf4b' : '#5b8def'; g.fillRect(x, 290 - bh, 96, bh);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = '700 16px "Pixelify Sans", monospace'; g.fillText(String(v), x + 48, 284 - bh);
    g.fillStyle = '#8a90b0'; g.font = '14px "Pixelify Sans", monospace'; g.fillText(d.slice(5), x + 48, 312);
  });
  return c.toDataURL('image/png');
}

export function createAdmin(ctx) {
  const { uid } = ctx;
  let timer = null, last = null;

  async function login(given) {
    // Büyük/küçük harf fark etmez: kurallardaki şifre küçük harfle yazılı, girileni de küçültüp gönderiyoruz
    const pw = (given || prompt(t('Şifre?')) || '').trim().toLocaleLowerCase('tr-TR');
    if (!pw) return false;
    try { await set(ref(db, `admins/${uid}`), pw); return true; }
    catch { toast(t('Şifre yanlış 🔒')); return false; }
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

  async function refresh() {
    try { last = statsScreen(await stats()); ctx.game.setPicture('admintv', 'admin', TV_RECT, last); }
    catch (e) { console.warn(e); toast(t('İstatistikler okunamadı. Veritabanı kurallarını güncelledin mi?'), 5000); }
  }
  /** Odaya girince TV dakikada bir yenilenir; çıkınca durur. */
  function onScene(scene) {
    clearInterval(timer); timer = null;
    if (scene !== 'admin') { ctx.game.setPicture('admintv', 'admin', TV_RECT, null); return; }
    refresh(); timer = setInterval(refresh, 60_000);
  }
  async function enter(pw) {
    if (!(await login(pw))) return;
    ctx.game.goto('admin', 96, 118);
    toast(t('Admin odası 🛠️ Evine dönmek için alttaki kapıdan çık.'), 4000);
  }
  function openTv() {
    const b = openSheet({ title: 'İstatistik', iconName: 'tv', wide: true });
    b.append(last ? h('img', { class: 'bigphoto', src: last, alt: '' }) : h('p', {}, t('Yükleniyor…')), h('button', { onclick: async () => { await refresh(); b.querySelector('img')?.setAttribute('src', last); } }, 'Yenile'));
  }

  return { enter, onScene, openTv };
}
