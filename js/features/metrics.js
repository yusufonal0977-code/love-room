// Kullanım ölçüsü. Şimdilik yalnızca günlük aktiflik ve çevrimiçi sayacı (admin panelinde okunur); K12'de kişiyi tanımlamayan olay sayaçlarına genişletilecek.
// metrics/active/{gün}/{uid} = true, metrics/online/{uid} = son görülme. Hesap silinince ikisi de silinir (main.js deleteEverything).
import { db, ref, set, serverTimestamp, now } from '../fb.js';

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
