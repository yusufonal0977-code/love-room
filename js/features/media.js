// Fotoğraf saklama (K6-C). PHOTO_URL tanımlıysa albüm ve tablo fotoğrafları Cloudflare R2'ye yüklenir, veritabanına yalnızca
// adresi yazılır (tools/cloudflare/foto/worker.js). Tanımlı değilse ya da yükleme başarısızsa eskisi gibi dataURL saklanır.
import { auth } from '../fb.js';
import { PHOTO_URL } from '../config.js';

/** dataURL'i R2'ye yükleyip https adresini döndürür; olmazsa dataURL'in kendisini. */
export async function storeImage(dataUrl) {
  if (!PHOTO_URL || !String(dataUrl).startsWith('data:image/')) return dataUrl;
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return dataUrl;
    const blob = await (await fetch(dataUrl)).blob();
    const r = await fetch(`${PHOTO_URL}/up`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': blob.type }, body: blob });
    if (!r.ok) throw new Error(`yükleme ${r.status}`);
    const { url } = await r.json();
    return url || dataUrl;
  } catch (e) { console.warn('fotoğraf R2', e); return dataUrl; }
}

/** Hesap silinince kişinin R2'deki tüm fotoğrafları (account.js çağırır). */
export async function deleteMyImages() {
  if (!PHOTO_URL) return;
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  if (token) await fetch(`${PHOTO_URL}/mine`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}
