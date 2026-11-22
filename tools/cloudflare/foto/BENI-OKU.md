# Fotoğraf deposu (K6-C): Cloudflare R2 + Worker

Neden: Fotoğraflar şu an veritabanında dataURL olarak duruyor; Firebase ücretsiz katmanı 1 GB depolama ve 10 GB aylık indirme. R2'nin ücretsiz katmanı 10 GB depolama ve indirme ücreti yok.

## Kurulum (bir kez)
1. Cloudflare hesabı aç (şirket e-postasıyla) ve R2'yi etkinleştir (ücretsiz katman).
2. Bu klasörde: `npx wrangler login`, sonra `npx wrangler r2 bucket create getloveroom-foto`, sonra `npx wrangler deploy`.
3. Çıkan adresi (ör. `https://getloveroom-foto.<hesap>.workers.dev`) `js/config.js` içindeki `PHOTO_URL`'e yaz.
4. Gizlilik metnine "fotoğraflar Cloudflare R2'de saklanır" maddesini ekle ve ikisini birlikte yayınla.

## Davranış
- `PHOTO_URL` boşken site eskisi gibi çalışır (dataURL). Doluyken yeni albüm ve tablo fotoğrafları R2'ye gider; eski fotoğraflar yerinde kalır.
- Hesap silinince `DELETE /mine` kişinin bütün fotoğraflarını siler.
- Adresler tahmin edilemez (128 bit rastgele); listeleme yok.
