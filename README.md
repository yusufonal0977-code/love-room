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
| **Salon** | TV (ekran yansıtma), kanepe, lambader, kedi |
| **Şömine odası** (sol kapı) | Şömine, tablolar, kitaplık, berjer, ilişki saati |
| **Balkon** (sağ kapı) | Saate göre gökyüzü (farklı saat dilimindeyseniz ikiye bölünür), şehir, bank, ışık zinciri |
| **Hobi köşesi** (arka kapı) | Gardırop (karakterini değiştir), şövale, fotoğraf kabini, çalışma masası |

- **Sesli sohbet** iki kişi de odadayken kendiliğinden açılır. Konuşanın isminin yanında ses dalgası görünür.
- **Kamera:** açınca görüntün karakterinin başının üstünde bir baloncukta çıkar.
- **Ekran yansıtma** (🖥️, bilgisayarda): ekranın salondaki TV'de görünür. TV'ye dokununca büyür.
- **Tepkiler:** ❤️ kalp, 🤗 sarılma (yanında olman gerekir).
- Işıklar gerçek saate göre değişir. Gece lambalar, şömine ve ışık zinciri parlar.

## Teknik

- Sadece HTML + JavaScript (derleme yok). GitHub Pages'te yayınlanır.
- Giriş ve gerçek zamanlı veri: Firebase (Authentication + Realtime Database). Güvenlik kuralları: [`database.rules.json`](database.rules.json).
- Ses ve görüntü tarayıcılar arasında doğrudan akar (WebRTC). Firebase sadece bağlantı mesajlarını taşır.
- Yerelde denemek için klasörü herhangi bir statik sunucuyla aç (örn. `npx serve`).

Eski Expo/React Native sürümü `eski-expo-surumu` dalında ve v0.3–v0.5 sürümlerinde arşivlidir.
