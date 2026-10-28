# Love Room 💞

Uzaktaki çiftler için 4 duvarlı, gerçek zamanlı ortak sanal oda. Expo (iOS/Android/Web) + Node (Express + Socket.IO + SQLite).

## Çalıştırma

`baslat.cmd` dosyasına çift tıkla — sunucu ve uygulama iki pencerede açılır, tarayıcıda http://localhost:8081.

Elle:

```bash
npm.cmd install
npm.cmd run server     # http://localhost:4000
npm.cmd run app        # http://localhost:8081
```

Uçtan uca test (sunucu açıkken): `npm.cmd run test:sync -w server`

**İki kişiyle denemek:** Google ayarlı değilken "Hızlı giriş" açık. Bu giriş sekmeye özeldir; aynı tarayıcıda iki sekmede iki farklı isimle girebilirsin.

## Arkadaşlarla paylaşmak (herkese açık link)

`paylas.cmd` dosyasına çift tıkla. Web sürümü derlenir, sunucu ve bir Cloudflare tüneli açılır, `https://….trycloudflare.com` linki ekrana yazılır ve panoya kopyalanır. Linki gönder; açan herkes tarayıcıdan kullanabilir.

- Link, bilgisayarın ve açılan pencereler açık kaldıkça çalışır. Her çalıştırmada link değişir (hesap gerekmez).
- Linkte Google butonu gizlidir (Google sadece yetkilendirilmiş adreslerde çalışır); arkadaşlar **Hızlı giriş** ile isimleriyle girer. Linkten yapılan her hızlı giriş ayrı bir misafir hesabıdır.
- https olduğu için sesli/görüntülü arama farklı cihazlar arasında da çalışır.

## Sürümler ve arşiv

Her sürüm `vX.Y.Z` etiketiyle GitHub'a yüklenir ve [Releases](https://github.com/yusufonal0977-code/love-room/releases) sayfasına zip olarak eklenir. Aynı zip, projenin yanındaki `arsiv/` klasöründe de saklanır.

```bash
powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Version 0.4.0 -Notes "Neler değişti"
```

## Google girişini açmak

1. https://console.cloud.google.com → yeni proje ("Love Room").
2. **APIs & Services → OAuth consent screen**: External, uygulama adı ve e-posta. "Test users" kısmına kendi ve partnerinin Gmail adresini ekle.
3. **Credentials → Create credentials → OAuth client ID → Web application**
   - Authorized JavaScript origins: `http://localhost:8081`
   - Authorized redirect URIs: `http://localhost:8081` ve `http://localhost:8081/`
4. Oluşan **Client ID**'yi kopyala, `server/.env.example` dosyasını `server/.env` olarak kopyalayıp `GOOGLE_CLIENT_ID=` satırına yapıştır.
5. Sunucuyu yeniden başlat. Giriş ekranında "Google ile devam et" görünür. (Hızlı girişi de açık tutmak için `.env`'e `DEV_LOGIN=1` ekle.)

Mobil uygulama için iOS/Android client id'leri ayrıca oluşturulur: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (app) ve `GOOGLE_EXTRA_AUDIENCES` (server).

## Akış

Giriş (Google) → Oda kur (ad + ilişki başlangıç tarihi) → davet linki paylaş → partner linke tıklar, giriş yapar, katılır → ikiniz aynı odadasınız. Oda en fazla 2 kişilik; oturum ve oda kalıcıdır.

## Oda (taslaktaki yerleşim)

| Duvar | İçerik | Etkileşim |
|---|---|---|
| Ön — Sinema köşesi | TV, TV ünitesi, halı, kedi | Ortak film (senkron oynatma), kediyi besle/sev |
| Sağ — Pencere kenarı | Polaroid, pencere, polaroid; dolapta pikap ve soru kavanozu | Fotoğraf yükle; iki şehrin saati; ortak müzik; "Ask Me More" soruları + anı defteri |
| Arka — Kanepemiz | İlişki saati, kanepe, lambader | Birlikte kanepeye otur; birlikte geçen gün sayısı |
| Sol — Şömine başı | Tablo 1, şömine, Tablo 2 | Ateşi yak/söndür; tablolara fotoğraf |

**Saate göre ışık:** oda gerçek saati izler. Sabah aydınlık, akşamüstü altın ışık, gece lambalar, şömine ve peri ışıkları yanar. Önizlemek için adrese `?saat=21` (ya da `7.5`, `18`) ekle.

**Karakterler:** herkes kendi karakterini oluşturur (ten, saç, saç rengi, kıyafet, aksesuar). Karakterler avatar olarak görünür ve kanepeye oturur. Görüntülü aramada karakterin yerine kişinin videosu oturur. Ortak evcil hayvanın türü (kedi/köpek/tavşan), rengi, aksesuarı ve adı da değiştirilebilir.

Her yerde: ❤️ 🤗 💋 🥺 tepkileri (karşı tarafta animasyon + mesaj). Bir objeye dokunmak iki ekranı da oraya döndürür ve yakınlaştırır.

**Sesli/görüntülü arama** (üst bardaki 📞 🎥): WebRTC ile eşler arası; görüşme odanın köşesinde küçük bir pencerede sürer, dokununca büyür. Şimdilik web'de çalışır.
- Kamera/mikrofon yalnızca güvenli adreslerde açılır: `localhost` ya da `https://`. Telefondan LAN IP'siyle (http://192.168…) girildiğinde arama butonları gizlenir; iki cihaz arasında denemek için uygulamayı https ile yayınlayın (ör. `cloudflared tunnel` / ngrok ya da gerçek bir sunucu).
- Sadece STUN kullanılıyor; bazı mobil/kurumsal ağlarda bağlantı için TURN sunucusu gerekir (`app/src/call/callStore.ts` → `ICE_SERVERS`).
- Mobil uygulamada arama için `react-native-webrtc` içeren bir Expo development build gerekir.

## Mimari

```
packages/shared   Tipler + saf reducer (reduceRoom) — sunucu ve istemci aynı kodu çalıştırır
server/src
  env.ts          .env, veri klasörü, gizli anahtar
  db.ts           SQLite (node:sqlite): kullanıcılar, odalar, üyelikler, oda durumu
  auth.ts         Google ID token doğrulama + imzalı oturum token'ı
  http.ts         /api: config, auth, me, rooms, invites, uploads
  realtime.ts     Socket.IO: handshake'te kimlik → kullanıcının odası; aksiyon → reducer → yayın
app/src
  state/          session (giriş/oda), room (canlı oda durumu, iyimser dispatch)
  screens/        Login, CreateRoom, InviteShare, InviteAccept, Room
  room/           RoomNavigator (4 duvar), WallCanvas (sahne + zoom), Hud, FocusPanel, ReactionLayer
  room/objects/   TV, Pet, Sofa, WallClock, Fireplace, RoomWindow, PhotoFrame (SVG çizimler)
  ui/             Tema bileşenleri (Button, Card, Field, Avatar, Backdrop, Logo)
```

## Yol haritası (proje taslağından)

- ✅ Sesli/görüntülü sohbet (web) · ⏳ ekran paylaşımı, mobilde arama
- ✅ Ortak müzik dinleme (pikap)
- ✅ Çift soruları ("Ask Me More") + anı defteri
- Fotoğraf kabini (iki kameradan tek kare — arama altyapısının üstüne)
- Ortak yazılabilecek hikâye kitabı
- Karakter özelleştirme ve birlikte resim çizme
- Kullanım stiline göre rozetler ve dekorasyon mağazası (Film Delisi, Bakıcı → Pet → Ebeveyn…)

## Prod'a giderken

- SQLite → Postgres; yüklemeler → S3/R2/Supabase Storage; birden fazla sunucu için `@socket.io/redis-adapter`
- `DEV_LOGIN=0`, `CORS_ORIGIN` kendi alan adın, `AUTH_SECRET` sabit ve gizli
- Netflix/Disney+ gibi DRM'li servisler gömülemez; ortak izleme kendi video dosyaların/URL'lerinle çalışır
