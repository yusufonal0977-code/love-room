// Web bildirimleri (K24-A, K25-A+B). Yalnızca kullanıcı "Bildirimleri aç" deyince izin istenir; günde en fazla bir bildirim
// (sunucu tarafı sayar). Bildirim türleri: partnerin evde (home), partnerin kavanoz sorusunu cevapladı (jar).
//   push/{uid}/{anahtar} = { t: FCM jetonu, l: dil, at }   yalnızca kişinin kendisi yazar; kimse okuyamaz (gönderici sunucu okur)
// Gönderen: Google Apps Script "Get Love Room bildirim" (tools/apps-script/bildirim.gs). Android uygulamasında (WebView)
// web bildirimi çalışmaz; orada yerel bildirim 2.0.1 sürümüyle gelecek (K24-B).
import { h, openSheet, closeSheet, toast } from '../ui.js';
import { auth, db, ref, set, remove, serverTimestamp } from '../fb.js';
import { t, lang } from '../i18n.js';
import { app } from '../fb.js';
import { VAPID_KEY, PUSH_URL } from '../config.js';
import { track } from './metrics.js';

const FB = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js';
const KEY = 'lr.pushKey', ASKED = 'lr.pushAsked';
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* gizli sekme */ } } };

/** Bildirim servisi kuruldu mu (config.js'de VAPID anahtarı ve gönderici adresi var mı)? Kurulmadıysa menüde düğme görünmez. */
export const pushConfigured = () => !!(VAPID_KEY && PUSH_URL);
/** Bu cihazda web bildirimi mümkün mü? */
export const pushSupported = () => !!(VAPID_KEY && PUSH_URL && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !window.LoveRoomApp);

export function createPush(ctx) {
  const uid = ctx.uid;
  const on = () => pushSupported() && Notification.permission === 'granted' && !!ls.get(KEY);

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast(t('Bildirim izni verilmedi. Tarayıcı ayarlarından açabilirsin.'), 4500); return false; }
    try {
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const { getMessaging, getToken } = await import(FB);
      const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
      if (!token) throw new Error('jeton yok');
      const key = token.slice(-20).replace(/[^A-Za-z0-9_-]/g, '_');
      await set(ref(db, `push/${uid}/${key}`), { t: token, l: lang, at: serverTimestamp() });
      ls.set(KEY, key);
      track('push_on');
      toast(t('Bildirimler açık. Günde en fazla bir tane gelir.'), 4000);
      return true;
    } catch (e) { console.warn('bildirim', e); toast(t('Bildirimler açılamadı.')); return false; }
  }
  async function disable() {
    const key = ls.get(KEY);
    if (key) await remove(ref(db, `push/${uid}/${key}`)).catch(() => {});
    ls.set(KEY, null);
    toast(t('Bildirimler kapandı.'));
  }

  /** Ayar penceresi (menüdeki Bildirim düğmesi). */
  function open() {
    const b = openSheet({ title: 'Bildirimler', iconName: 'bell' });
    if (!pushSupported()) {
      b.append(h('p', {}, t(window.LoveRoomApp ? 'Android uygulamasında bildirimler bir sonraki uygulama sürümüyle gelecek.' : 'Bu tarayıcı bildirimleri desteklemiyor. iPhone\'da önce siteyi Ana Ekrana ekle, sonra buradan aç.')));
      return;
    }
    b.append(
      h('p', {}, t('Partnerin eve geldiğinde ya da kavanoz sorusunu cevapladığında haber verelim. Günde en fazla bir bildirim.')),
      on() ? h('button', { onclick: async () => { await disable(); closeSheet(); } }, 'Bildirimleri kapat')
        : h('button', { class: 'primary', onclick: async () => { if (await enable()) closeSheet(); } }, 'Bildirimleri aç'),
    );
  }

  /** Partnere haber ver (sunucu: partner şu an evdeyse ya da bugün zaten bildirim aldıysa göndermez). */
  async function notify(kind) {
    if (!PUSH_URL || !ctx.partnerUid() || ctx.partnerOnline()) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;
      // text/plain: Apps Script'e ön kontrol (CORS preflight) olmadan gider; yanıt okunmaz
      fetch(PUSH_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ idToken, kind }) }).catch(() => {});
    } catch { /* bildirim hiçbir zaman uygulamayı bozmamalı */ }
  }

  /** Partner varsa ve izin hiç sorulmadıysa, bir kez nazikçe öner (tarayıcı izni yalnızca düğmeye basınca istenir). */
  function suggest() {
    if (!pushSupported() || Notification.permission !== 'default' || ls.get(ASKED) || !ctx.partnerUid()) return;
    ls.set(ASKED, '1');
    setTimeout(open, 1500);
  }

  // Jeton tarayıcıda silinmişse (izin geri alındı) kaydı temizle
  if (pushSupported() && Notification.permission !== 'granted' && ls.get(KEY)) disable();
  return { open, notify, suggest, enabled: on };
}
