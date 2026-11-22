// Get Love Room: partnere web bildirimi gönderir (K24-A, K25-A+B).
// Google Apps Script web uygulaması (eclipsoftware.dev hesabı, "Get Love Room bildirim"). Çalıştıran: Ben, Erişim: Herkes.
// Koda gizli bilgi yazılmaz. Bu hesap Firebase projesinde (love-room-aaf7e) Sahip ya da Düzenleyici olmalı; veritabanını ve
// FCM'yi kendi yetkisiyle kullanır (ScriptApp.getOAuthToken). appsscript.json'a şu kapsamlar eklenir:
//   https://www.googleapis.com/auth/script.external_request
//   https://www.googleapis.com/auth/userinfo.email
//   https://www.googleapis.com/auth/firebase.database
//   https://www.googleapis.com/auth/firebase.messaging
//
// İstek (site js/features/push.js): POST düz metin {"idToken": "...", "kind": "home" | "jar"}
// 1. Kimlik Firebase'e sorulur (accounts:lookup); sahte istek kimseye bildirim gönderemez.
// 2. Gönderenin odası ve partneri veritabanından bulunur.
// 3. Partner şu an çevrimiçiyse (son 3 dakika) ya da bugün zaten bildirim aldıysa gönderilmez: günde en fazla 1.
// 4. Partnerin kayıtlı her cihazına FCM ile gönderilir; geçersiz jetonlar silinir.
const PROJECT = 'love-room-aaf7e';
const DB = 'https://love-room-aaf7e-default-rtdb.europe-west1.firebasedatabase.app';
const WEB_KEY = 'AIzaSyCrFiwx-bcYCBKXWHYoK0EQvnmxr3teUdU'; // Firebase web anahtarı: herkese açıktır, sitede de yazar

const TEXT = {
  tr: { home: ['{n} evde', 'Ortak evinize uğradı. Sen de gel.'], jar: ['{n} kavanoz sorusunu cevapladı', 'Sen de cevapla, cevaplar aynı anda açılsın.'] },
  en: { home: ['{n} is home', 'They just dropped by your shared home. Come say hi.'], jar: ['{n} answered the jar question', 'Answer too and both answers open together.'] },
  es: { home: ['{n} está en casa', 'Acaba de pasar por vuestra casa. Ven tú también.'], jar: ['{n} respondió la pregunta del frasco', 'Responde tú y las respuestas se abren a la vez.'] },
  de: { home: ['{n} ist zu Hause', 'Gerade in eurem gemeinsamen Zuhause. Komm vorbei.'], jar: ['{n} hat die Glasfrage beantwortet', 'Antworte auch, dann öffnen sich beide Antworten.'] },
  fr: { home: ['{n} est à la maison', 'Vient de passer dans votre maison. Rejoins-le.'], jar: ['{n} a répondu à la question du bocal', 'Réponds aussi et les réponses s\'ouvrent ensemble.'] },
  pt: { home: ['{n} está em casa', 'Acabou de passar pela casa de vocês. Vem também.'], jar: ['{n} respondeu à pergunta do pote', 'Responda também e as respostas abrem juntas.'] },
  ar: { home: ['{n} في البيت', 'مرّ للتو على بيتكما المشترك. تعال أنت أيضًا.'], jar: ['{n} أجاب على سؤال الجرة', 'أجب أنت أيضًا لتُفتح الإجابتان معًا.'] },
  ko: { home: ['{n}님이 집에 있어요', '함께하는 집에 방금 들렀어요. 같이 가요.'], jar: ['{n}님이 병 질문에 답했어요', '당신도 답하면 두 답이 함께 열려요.'] },
  zh: { home: ['{n} 在家', '刚刚来到你们的共同小屋，快来吧。'], jar: ['{n} 回答了罐子里的问题', '你也回答吧，两个答案会同时揭晓。'] },
  ja: { home: ['{n}さんが家にいます', 'ふたりの家に来ています。あなたも来てね。'], jar: ['{n}さんが瓶の質問に答えました', 'あなたも答えると、ふたりの答えが同時に開きます。'] },
};

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const kind = body.kind === 'jar' ? 'jar' : 'home';
    const uid = whoIs(body.idToken);
    if (!uid) return out({ ok: false, why: 'kimlik' });
    const me = dbGet('users/' + uid) || {};
    const room = me.roomId ? dbGet('rooms/' + me.roomId) : null;
    if (!room || (room.a !== uid && room.b !== uid)) return out({ ok: false, why: 'oda' });
    const partner = room.a === uid ? room.b : room.a;
    if (!partner) return out({ ok: false, why: 'partner yok' });
    const seen = dbGet('metrics/online/' + partner);
    if (seen && Date.now() - seen < 3 * 60 * 1000) return out({ ok: false, why: 'çevrimiçi' });
    const today = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd');
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      if (dbGet('pushSent/' + partner) === today) return out({ ok: false, why: 'bugün gönderildi' });
      const tokens = dbGet('push/' + partner) || {};
      const keys = Object.keys(tokens);
      if (!keys.length) return out({ ok: false, why: 'jeton yok' });
      dbPut('pushSent/' + partner, today);
      let sent = 0;
      keys.forEach(function (k) {
        const tk = tokens[k] || {};
        const L = TEXT[tk.l] || TEXT.en;
        const [title, text] = L[kind].map(function (s) { return s.replace('{n}', String(me.name || 'Partnerin').slice(0, 30)); });
        const r = UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/' + PROJECT + '/messages:send', {
          method: 'post', contentType: 'application/json', muteHttpExceptions: true,
          headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
          payload: JSON.stringify({ message: { token: tk.t, webpush: {
            notification: { title: title, body: text, icon: 'https://getloveroom.com/assets/icon-192.png', tag: 'lr-' + kind },
            fcm_options: { link: 'https://getloveroom.com/' },
          } } }),
        });
        const code = r.getResponseCode();
        if (code === 200) sent++;
        else if (code === 404 || code === 400 && /UNREGISTERED|INVALID_ARGUMENT/.test(r.getContentText())) dbPut('push/' + partner + '/' + k, null);
      });
      return out({ ok: sent > 0, sent: sent });
    } finally { lock.releaseLock(); }
  } catch (err) {
    return out({ ok: false, why: String(err && err.message || err).slice(0, 120) });
  }
}

function whoIs(idToken) {
  if (!idToken) return null;
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + WEB_KEY, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ idToken: idToken }),
  });
  if (r.getResponseCode() !== 200) return null;
  const u = (JSON.parse(r.getContentText()).users || [])[0];
  return u && u.localId || null;
}
function dbGet(path) {
  const r = UrlFetchApp.fetch(DB + '/' + path + '.json?access_token=' + ScriptApp.getOAuthToken(), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('okuma ' + r.getResponseCode());
  return JSON.parse(r.getContentText());
}
function dbPut(path, value) {
  UrlFetchApp.fetch(DB + '/' + path + '.json?access_token=' + ScriptApp.getOAuthToken(), {
    method: value === null ? 'delete' : 'put', contentType: 'application/json', muteHttpExceptions: true,
    payload: value === null ? undefined : JSON.stringify(value),
  });
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Kurulumdan sonra bir kez editörden çalıştır: yetki ister ve veritabanına erişimi dener. */
function deneme() {
  const r = UrlFetchApp.fetch(DB + '/rooms.json?shallow=true&access_token=' + ScriptApp.getOAuthToken(), { muteHttpExceptions: true });
  Logger.log(r.getResponseCode() === 200 ? 'veritabanı erişimi tamam' : 'veritabanı erişimi YOK: ' + r.getResponseCode());
}
