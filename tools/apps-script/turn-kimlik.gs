// Get Love Room: sesli/görüntülü sohbet için kısa ömürlü TURN kimliği (K1).
// Google Apps Script web uygulaması (eclipsoftware.dev hesabı, "Get Love Room TURN kimliği"). Çalıştıran: Ben, Erişim: Herkes.
// Gizli bilgiler koda yazılmaz: Proje Ayarları > Komut dosyası özellikleri:
//   METERED_DOMAIN  ör. getloveroom.metered.live   (Metered panelinde Developers sayfasında yazar)
//   METERED_SECRET  Metered gizli anahtarı (Developers > Secret key > Reveal)
// Metered'a göre yeni kimliğin her yerde geçerli olması 2 dakika sürer ve süresi dolunca görüşme anında kesilir. Bu yüzden:
// kimlik 24 saat geçerli üretilir, 12 saat paylaşılır; 12. saatten sonra yenisi önceden üretilir, en az 3 dakika bekledikten
// sonra devreye girer. Böylece hiçbir görüşme yarıda kesilmez ve her ziyaretçiye ayrı kimlik üretilmez.
const LIFE = 24 * 3600, SHARE = 12 * 3600 * 1000, WARM = 3 * 60 * 1000;

function doGet() {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const now = Date.now();
    let cur = JSON.parse(props.getProperty('cur') || 'null');
    let next = JSON.parse(props.getProperty('next') || 'null');
    if (!cur || now - cur.at > LIFE * 1000 - 60000) { cur = create(props); next = null; } // ilk kurulum ya da hiç istek gelmemiş
    else if (now - cur.at > SHARE) {
      if (next && now - next.at > WARM) { cur = next; next = null; }
      else if (!next) next = create(props);
    }
    props.setProperty('cur', JSON.stringify(cur));
    props.setProperty('next', JSON.stringify(next));
    return out({ iceServers: cur.ice, at: cur.at });
  } catch (e) {
    const secret = PropertiesService.getScriptProperties().getProperty('METERED_SECRET') || '';
    let msg = String(e && e.message || e);
    if (secret) msg = msg.split(secret).join('***'); // hata mesajında gizli anahtar asla görünmez
    return out({ iceServers: [], error: 'kimlik alınamadı: ' + msg.replace(/secretKey=[^&\s]*/g, 'secretKey=***').slice(0, 200) });
  } finally {
    lock.releaseLock();
  }
}

function create(props) {
  const domain = String(props.getProperty('METERED_DOMAIN') || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const secret = String(props.getProperty('METERED_SECRET') || '').trim();
  if (!domain) throw new Error('METERED_DOMAIN eksik');
  if (!secret) throw new Error('METERED_SECRET eksik');
  const r = UrlFetchApp.fetch('https://' + domain + '/api/v1/turn/credential?secretKey=' + encodeURIComponent(secret), {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ expiryInSeconds: LIFE, label: 'web-' + new Date().toISOString().slice(0, 13) }),
  });
  if (r.getResponseCode() !== 200) throw new Error('create ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 120));
  const c = JSON.parse(r.getContentText());
  const s = UrlFetchApp.fetch('https://' + domain + '/api/v1/turn/credentials?apiKey=' + encodeURIComponent(c.apiKey), { muteHttpExceptions: true });
  if (s.getResponseCode() !== 200) throw new Error('ice ' + s.getResponseCode());
  return { at: Date.now(), ice: JSON.parse(s.getContentText()) };
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
