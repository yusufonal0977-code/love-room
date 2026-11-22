// Hesap silmenin veritabanı kısmı (main.js'den ayrıldı, K32). Gizlilik metninin sözü: kişiyi tanımlayan her kayıt silinir.
// Her adım ayrı istek: biri reddedilirse (ör. hiç admin işareti yoksa) diğerleri yine silinir.
import { db, get, ref, remove, update } from '../fb.js';
import { dayKey } from './metrics.js';

export async function deleteAccountData({ uid, rid, room }) {
  const quiet = (what) => (e) => console.warn(`silme: ${what}`, e);
  const sc = (await get(ref(db, `live/${rid}/showcase`)).catch(() => null))?.val();
  if (sc) {
    await remove(ref(db, `showcase/${sc}`)).catch(quiet('vitrin'));
    await remove(ref(db, `showcaseRid/${sc}`)).catch(quiet('vitrin odası'));
  }
  if (room?.info?.invite) await remove(ref(db, `invites/${room.info.invite}`)).catch(quiet('davet'));
  await remove(ref(db, `live/${rid}`));
  await remove(ref(db, `rooms/${rid}`));
  await remove(ref(db, `users/${uid}`));
  // Kullanım sayaçları: son 400 günün aktiflik kaydı ve çevrimiçi işareti (K2)
  const gone = { [`metrics/online/${uid}`]: null };
  for (let i = 0; i < 400; i++) gone[`metrics/active/${dayKey(Date.now() - i * 864e5)}/${uid}`] = null;
  await update(ref(db), gone).catch(quiet('sayaçlar'));
  // Görüşler, bildirim jetonları, bildirim günlüğü, admin işareti
  for (const p of [`feedback/${uid}`, `push/${uid}`, `pushSent/${uid}`, `admins/${uid}`]) await remove(ref(db, p)).catch(() => {});
}
