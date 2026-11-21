// Get Love Room: sitedeki "Erken erişim iste" formundan gelen adresleri şirket posta kutusuna hatırlatma olarak yollar.
// Web uygulaması olarak dağıtılır (Çalıştıran: Ben, Erişim: Herkes). Adres yalnızca bu kutuya gider, başka yerde saklanmaz.
const TO = 'eclipsoftware.dev@gmail.com';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const email = String(d.email || '').trim().toLowerCase();
    if (email.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply('bad');
    const cache = CacheService.getScriptCache();
    if (cache.get('r:' + email)) return reply('dup');   // aynı adres 6 saat içinde tekrar yollanmaz
    const n = Number(cache.get('n') || 0);
    if (n >= 40) return reply('limit');                 // saatte en fazla 40 istek (kötüye kullanıma karşı)
    cache.put('r:' + email, '1', 21600);
    cache.put('n', String(n + 1), 3600);
    const lang = String(d.lang || '').replace(/[^a-zA-Z-]/g, '').slice(0, 8);
    MailApp.sendEmail({
      to: TO,
      subject: 'Get Love Room erken erişim isteği: ' + email,
      body: 'Yeni erken erişim isteği geldi.\n\n' +
        'Adres: ' + email + '\n' +
        'Dil: ' + (lang || '-') + '\n\n' +
        'Yapılacak: Play Console > Test et > Kapalı test > Alpha > Test kullanıcıları > "Deneme1" listesini düzenle > adresi ekle > Değişiklikleri kaydet.\n' +
        'Eklenince kullanıcı şu bağlantıdan katılabilir: https://play.google.com/apps/testing/com.eclip.getloveroom\n'
    });
    return reply('ok');
  } catch (err) {
    return reply('err');
  }
}

function doGet() {
  return reply('ok');
}

function reply(s) {
  return ContentService.createTextOutput(s);
}
