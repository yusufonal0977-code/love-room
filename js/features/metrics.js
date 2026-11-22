// Kullanım ölçüsü (K12). Dışarıdan analiz aracı yok; her şey kendi veritabanımızda, yalnızca adminler okur (yonetim.html).
//   metrics/active/{gün}/{uid} = true     günlük aktiflik (D1/D7 geri dönüş buradan hesaplanır)
//   metrics/online/{uid}       = son görülme
//   metrics/events/{gün}/{olay} = sayı    kişiyi tanımlamayan olay sayaçları (ev kuruldu, partner katıldı, film...)
// Hesap silinince active/online kayıtları silinir (main.js deleteEverything); olay sayaçlarında kimlik yoktur.
import { db, ref, set, update, increment, serverTimestamp, now } from '../fb.js';

export const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Uygulama açıkken dakikada bir: bugün aktif ve şu an çevrimiçi işareti. */
export function trackActivity(uid) {
  const ping = () => {
    if (document.visibilityState !== 'visible') return;
    set(ref(db, `metrics/active/${dayKey(now())}/${uid}`), true).catch(() => {});
    set(ref(db, `metrics/online/${uid}`), serverTimestamp()).catch(() => {});
  };
  ping();
  return setInterval(ping, 60_000);
}

/** Bir olayı günlük sayaca ekler. Ad küçük harf ve alt çizgi (kural da bunu ister). Hata sessizce yutulur: sayaç hiçbir zaman uygulamayı bozmamalı. */
export function track(event) {
  if (!/^[a-z_]{2,24}$/.test(event)) return;
  update(ref(db, `metrics/events/${dayKey(now())}`), { [event]: increment(1) }).catch(() => {});
}
