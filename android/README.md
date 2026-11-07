# Get Love Room Android

Siteyi (https://getloveroom.com) uygulama olarak açar ve ana ekrana üç widget ekler:
ortak tuval, evcil dostumuz ve ilişki saatimiz.

- Uygulama açıkken site köprüden (LoveRoomApp) oturumu ve evcil hayvan resmini verir; widget'lar hemen yenilenir.
- Uygulama kapalıyken WidgetWorker 15 dakikada bir Firebase'den (REST) okur: çizgiler, hayvan, ilişki tarihi.
- Derleme: `scripts/build-apk.ps1` (JDK 17 + Android SDK gerekir). İmza anahtarı depoda değildir (`keystore.properties`).
