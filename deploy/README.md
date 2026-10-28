# Love Room'u kalıcı yayınlamak

İki parça gerekir: **alan adı** (loveroom.com gibi adres) ve uygulamanın 7/24 çalışacağı bir **sunucu**.

## 1. Sunucu (VPS) — önerilen: Hetzner CX22 (~€4–5/ay) ya da DigitalOcean ($6/ay)

1. Ubuntu 24.04 sunucu oluştur, IP adresini not et.
2. Alan adının DNS ayarlarında iki kayıt ekle:
   - `A` kaydı: `@` → sunucu IP
   - `A` kaydı: `www` → sunucu IP
3. Sunucuya bağlan ve Docker'ı kur:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
4. Kodu indir ve ayarları yaz:
   ```bash
   git clone https://github.com/yusufonal0977-code/love-room.git
   cd love-room
   cp server/.env.example server/.env   # GOOGLE_CLIENT_ID'yi yaz, DEV_LOGIN=1 istersen ekle
   ```
5. Başlat (alan adını kendi adresinle değiştir):
   ```bash
   cd deploy
   DOMAIN=loveroom.com docker compose up -d --build
   ```
   Birkaç dakika içinde `https://loveroom.com` açılır; HTTPS sertifikasını Caddy kendisi alır.

**Güncelleme** (her yeni sürümde):
```bash
cd love-room && git pull && cd deploy && DOMAIN=loveroom.com docker compose up -d --build
```
Odalar, hesaplar ve fotoğraflar `loveroom-data` biriminde durur; güncellemelerde silinmez.

## 2. Google girişi

Google Cloud Console → Credentials → OAuth client → **Authorized JavaScript origins** ve **redirect URIs** listesine `https://loveroom.com` ekle. Uygulamayı "Testing"ten "In production"a alırsan herkes Google ile girebilir.

## Alternatif: sunucu kiralamadan, kendi bilgisayarından (ücretsiz)

Alan adını Cloudflare'e bağlayıp "named tunnel" ile bilgisayarındaki uygulamayı `loveroom.com` adresinde yayınlamak mümkün. Link sabit olur ama bilgisayar açıkken çalışır.
