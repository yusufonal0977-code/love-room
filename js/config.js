// Get Love Room ayarları. Buradaki değerler tarayıcıda çalıştığı için gizli değildir:
// Firebase'in güvenliği database.rules.json'da; TURN ve Spotify bilgileri istemci kullanımı için tasarlanmıştır.
export const firebaseConfig = {
  apiKey: 'AIzaSyCrFiwx-bcYCBKXWHYoK0EQvnmxr3teUdU',
  authDomain: 'love-room-aaf7e.firebaseapp.com',
  databaseURL: 'https://love-room-aaf7e-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'love-room-aaf7e',
  storageBucket: 'love-room-aaf7e.firebasestorage.app',
  messagingSenderId: '659700018210',
  appId: '1:659700018210:web:1e79b8013356889665ee7b',
};

/** Davet linklerinin ve Spotify dönüşünün kökü: sayfanın kendi adresi. */
export const APP_URL = location.origin + location.pathname.replace(/index\.html$/, '');

/**
 * Sesli/görüntülü sohbet bağlantı sunucuları. STUN çoğu ağda yeter; mobil veri ve bazı modemlerde bağlantı TURN (Metered)
 * aracılığıyla kurulur. TURN kimliği artık kodda durmaz (K1): Google Apps Script servisi (tools/apps-script/turn-kimlik.gs)
 * 24 saat geçerli kimliği verir; cihaz 6 saat önbellekte tutar. Servise ulaşılamazsa yalnızca STUN ile denenir.
 */
const STUN = { urls: ['stun:stun.l.google.com:19302', 'stun:stun.relay.metered.ca:80'] };
const ICE_URL = 'https://script.google.com/macros/s/AKfycbxmLD8DaN8HIchlerjd51TU7btQALZRvbyYng9EybGTYI4sy0txbisA9itvhEPoEejvyw/exec';
const ICE_KEY = 'lr.ice', ICE_TTL = 6 * 3600 * 1000;
export let ICE_SERVERS = [STUN];
let iceLoad = null;
/** TURN kimliğini alır (açılışta bir kez); call.js yeni bağlantıda güncel listeyi kullanır. */
export function loadIce() {
  if (iceLoad) return iceLoad;
  const use = (list) => { if (Array.isArray(list) && list.length) ICE_SERVERS = [STUN, ...list]; };
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(ICE_KEY) || 'null'); } catch { /* gizli sekme */ }
  if (cached && Date.now() - cached.at < ICE_TTL) { use(cached.list); return (iceLoad = Promise.resolve()); }
  iceLoad = fetch(ICE_URL, { signal: AbortSignal.timeout(8000) }).then((r) => r.json()).then((j) => {
    if (!Array.isArray(j.iceServers) || !j.iceServers.length) throw new Error('boş');
    use(j.iceServers);
    try { localStorage.setItem(ICE_KEY, JSON.stringify({ at: Date.now(), list: j.iceServers })); } catch { /* gizli sekme */ }
  }).catch((e) => { console.warn('TURN kimliği alınamadı', e); if (cached) use(cached.list); iceLoad = null; });
  return iceLoad;
}

/**
 * Web bildirimleri (K24). VAPID_KEY: Firebase konsolu > Proje ayarları > Cloud Messaging > Web Push sertifikaları (herkese açık
 * anahtar, gizli değildir). PUSH_URL: tools/apps-script/bildirim.gs web uygulamasının adresi. İkisi de boşsa bildirim düğmesi
 * "desteklenmiyor" der ve hiçbir istek gönderilmez.
 */
/** "Bize destek ol" bağış sayfası (K14-B; Ko-fi ya da Buy Me a Coffee). Boşsa düğme görünmez. */
export const DONATE_URL = 'https://buymeacoffee.com/eclip';

/** Fotoğraf deposu (K6-C, tools/cloudflare/foto). Boşsa fotoğraflar eskisi gibi veritabanında durur. */
export const PHOTO_URL = '';

export const VAPID_KEY = 'BNnlIITcNQ5IsxW5jekTRq4io_0f4UukVzovsAZn5E0Qk3mekCMU9VfHjZG3v5536YHAdYMrE8Aaro2WM7xU9co';
export const PUSH_URL = 'https://script.google.com/macros/s/AKfycbz4ZEYMJVgqMYcLz9Lwf9-7BWUce8o71ldvUJEF7s_H3CH1PcN1l_QqLvuxQJLuAlAQgw/exec';

/** Spotify geliştirici uygulaması (PKCE, gizli anahtar gerekmez). */
export const SPOTIFY_CLIENT_ID = '925064e861c146678848c22db62e859a';
