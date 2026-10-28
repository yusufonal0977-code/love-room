# Love Room ☀️🌙

Uzaktaki çiftler için piksel bir ev. Aynı odada yürüyün, kanepede yan yana oturun, konuşun.

**▶ Oyna:** https://yusufonal0977-code.github.io/love-room/

Bir [Eclip Software & Entertainment](#) yapımı.

## Nasıl?

1. Linki aç, Google ile ya da sadece adınla gir.
2. "Evimizi kur" de. Çıkan davet linkini partnerine gönder.
3. Partnerin linke tıklayınca aynı evdesiniz. Biriniz güneş ☀️, diğeriniz ay 🌙.

Ok tuşları/WASD ile yürü, **E** ile etkileş. Telefonda gideceğin yere dokunman yeterli.

## Ev

| Sahne | İçinde |
|---|---|
| **Salon** | Duvarda TV ve tam karşısında kanepe (birlikte film), pikap (Spotify), soru kavanozu, lambader, kedi ve mama kabı, foto tablosu |
| **Şömine odası** (sol kapı) | Şömine, iki foto tablosu, kitaplıkta günlük, berjer, ilişki saati |
| **Balkon** (sağ kapı) | Saate göre gökyüzü (farklı saat dilimindeyseniz ikiye bölünür), bank, langırt masası, bizim çiçeğimiz |
| **Hobi köşesi** (arka kapı) | Gardırop + dekor dolabı, şövale (birlikte çizim), fotoğraf kabini, oyun masası |

Alt çubuktaki **Birlikte** düğmesi her şeyi tek yerden açar.

- **Sesli/görüntülü sohbet** iki kişi de odadayken kendiliğinden açılır. Sol üstteki nokta bağlantıyı gösterir (yeşil: bağlı); dokununca tanı ve "yeniden bağlan".
- **Film:** TV'ye YouTube ya da .mp4 linki yapıştır; ikinizde aynı saniyede oynar, durdurma/sarma eşlenir. Sinema modu tam ekran. Bilgisayardan **ekran yansıtma** sesli ve 1080p (telefon tarayıcıları ekran yansıtmaya izin vermez).
- **Müzik:** Spotify hesaplarınızı bağlayın, bir liste seçin: ikinizde aynı şarkı çalar (Premium gerekir; telefonda Spotify uygulaması üzerinden).
- **Anılar:** tablolara fotoğraf asın, albüm, fotoğraf kabini (aynı anda çekim ya da çocukluk fotoğrafları yan yana), günlük ve geleceğe mektup, ilişki saati ve buluşma geri sayımı, soru kavanozu (cevaplar ikiniz de yazınca açılır).
- **Birlikte:** çizim, XOX, hafıza, langırt; kedi bakımı, çiçek sulama, rozetler.
- **Ev:** dekor dolabından eşya ekleyin, odaları boyayın, eşyaları sürükleyip taşıyın.
- **Dokunuşlar:** kalp, sarılma ve öpücük (yan yana olunca karakterler birbirine dönüp sarılır/öpüşür).
- **Küçük pencere** modu ve **tam ekran** (telefonda "Ana Ekrana Ekle" ile uygulama gibi açılır).

## Teknik

- Sadece HTML + JavaScript (derleme yok). GitHub Pages'te yayınlanır.
- Giriş ve gerçek zamanlı veri: Firebase (Authentication + Realtime Database). Güvenlik kuralları: [`database.rules.json`](database.rules.json).
- Ses ve görüntü tarayıcılar arasında doğrudan akar (WebRTC); zor ağlarda Metered TURN aktarıcısı kullanılır. Firebase sadece bağlantı mesajlarını taşır.
- Spotify: PKCE ile giriş (gizli anahtar yok). Geliştirme modunda dinleyecek hesapların Spotify panelinde User Management'a eklenmesi gerekir.
- Yerelde denemek için klasörü herhangi bir statik sunucuyla aç (örn. `npx serve`).

Eski Expo/React Native sürümü `eski-expo-surumu` dalında ve v0.3–v0.5 sürümlerinde arşivlidir.
