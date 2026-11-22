// Telefon uygulaması (Android) ile köprü. Uygulama siteyi açar ve window.LoveRoomApp'i verir; widget'lar (ortak tuval,
// evcil dostumuz, ilişki saatimiz) uygulama kapalıyken Firebase'den kendileri okur. Burada site uygulamaya oturumu,
// hayvanın piksel resmini ve "bir şey değişti, widget'ları yenile" haberini verir. Tarayıcıda hiçbir şey yapmaz.
import { auth, db, onValue, ref, set, serverTimestamp } from '../fb.js';
import { petSprites } from '../art.js';
import { DECOR } from '../scenes.js';
import { h, icon, openSheet, toast } from '../ui.js';
import { t } from '../i18n.js';

export const inApp = () => !!window.LoveRoomApp;
export const APK_URL = 'https://github.com/yusufonal0977-code/love-room/releases/download/android/GetLoveRoom.apk';
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.eclip.getloveroom';
/** Kapalı test katılım bağlantısı: yalnızca test listesindeki Gmail hesaplarıyla çalışır. */
/** Erken erişim isteği bildirimi: Apps Script web uygulaması adresi şirket posta kutusuna hatırlatma e-postası yollar (adres başka yerde saklanmaz). */
const REQUEST_URL = 'https://script.google.com/macros/s/AKfycbwyq3xKCuAp0OojTFwRxc4NWs9lQdZHQYncdDEJaKhN80ZXNTY3bXK3poa5LFPhZ5WrFA/exec';
export const TEST_URL = 'https://play.google.com/apps/testing/com.eclip.getloveroom';

export function connectApp(ctx, { rid, care, draw, life, spotify }) {
  const app = window.LoveRoomApp;
  // Widget'a dokununca uygulama ilgili pencereyi açtırır
  const actions = { draw: () => draw.open(), pet: () => care.openPet(), clock: () => life.openClock(), music: () => spotify?.open() };
  window.__lrAction = (ac) => actions[ac]?.();
  const ac = new URLSearchParams(location.search).get('ac');
  if (ac) setTimeout(() => window.__lrAction(ac), 900);
  if (!app) return;
  // K5-B: widget'lar için yalnızca widget verisini okuyabilen, iptal edilebilir anahtar (widgetKeys/{uid}/{anahtar}).
  // Android 2.0.1 bu anahtarla servisten okur; 2.0.0 hâlâ refreshToken kullandığı için o da şimdilik gönderilir.
  let wkey = null;
  try { wkey = localStorage.getItem('lr.wkey'); } catch { /* gizli sekme */ }
  if (!wkey) { wkey = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join(''); try { localStorage.setItem('lr.wkey', wkey); } catch { /* gizli sekme */ } }
  set(ref(db, `widgetKeys/${ctx.uid}/${wkey}`), { rid, at: serverTimestamp() }).catch(() => {});
  const send = () => app.session(JSON.stringify({ rid, uid: ctx.uid, widgetKey: `${ctx.uid}.${wkey}`, refreshToken: auth.currentUser?.refreshToken || '', lang: document.documentElement.lang }));
  send();
  let tmr = null;
  const refresh = () => { clearTimeout(tmr); tmr = setTimeout(() => app.refresh(), 2500); };
  let petKey = '';
  onValue(ctx.live.ref('pet'), () => {
    const p = care.petNow();
    const key = p.species + p.color;
    if (key !== petKey) { petKey = key; const img = petSprites(p.species, p.color).right[0]; app.petImage(key, img.toDataURL('image/png')); }
    refresh();
  }, () => {});
  onValue(ctx.live.ref('draw'), refresh, () => {});
  onValue(ctx.live.ref('rel'), refresh, () => {});
  // Widget arka planları: evinizin gerçek odaları (boya, eşyalar, saat ışığı); dekor ya da saat değişince yenilenir
  if (app.sceneArt) {
    let lastKey = '';
    const art = () => {
      try {
        const g = ctx.game, pl = ctx.partnerProfile?.()?.look;
        const key = `${DECOR.v}|${new Date().getHours()}|${!!pl}`;
        if (key === lastKey) return;
        lastKey = key;
        const people = [{ look: ctx.myLook(), x: 84, y: 100 }, ...(pl ? [{ look: pl, x: 108, y: 100 }] : [])];
        const crop = (src, x, y, w, h) => { const c = document.createElement('canvas'); c.width = w * 4; c.height = h * 4; const k = c.getContext('2d'); k.imageSmoothingEnabled = false; k.drawImage(src, x, y, w, h, 0, 0, c.width, c.height); return c.toDataURL('image/png'); };
        const salon = g.renderScene('salon');
        app.sceneArt('clock', crop(g.renderScene('somine', people), 46, 20, 100, 100));
        app.sceneArt('pet', crop(salon, 0, 60, 192, 84));
        app.sceneArt('draw', crop(g.renderScene('hobi'), 20, 4, 130, 94));
        app.sceneArt('music', crop(salon, 119, 21, 52, 52));
        app.refresh();
      } catch (e) { console.warn('widget resmi', e); }
    };
    setTimeout(art, 3000);
    setInterval(art, 60_000);
  }
  onValue(ctx.live.ref('ytradio/title'), refresh, () => {});
  onValue(ctx.live.ref('music'), refresh, () => {});
}

const WIDGETS = [
  { kind: 'clock', name: 'İlişki saatimiz', desc: 'Kaçıncı gününüz, kavuşmaya kaç gün kaldı' },
  { kind: 'pet', name: 'Evcil dostumuz', desc: 'Dostunuz, hali ve ihtiyaçları' },
  { kind: 'draw', name: 'Ortak tuvalimiz', desc: 'Birlikte çizdiğiniz tuval' },
  { kind: 'music', name: 'Pikabımız', desc: 'Evde şimdi çalan şarkı' },
];
/** Menüdeki "Widget ekle": uygulamada tek dokunuşla ana ekrana ekler; tarayıcıda uygulamayı indirmeye yönlendirir. */
export function openWidgets() {
  const app = window.LoveRoomApp;
  const b = openSheet({ title: 'Widget ekle', iconName: 'grid', wide: true });
  const can = !!app?.canPinWidget?.();
  b.append(h('p', {}, t(app ? (can ? 'Birini seç, telefon ana ekrana eklemek isteyip istemediğini soracak.' : 'Ana ekranda boş bir yere basılı tut, "Widget\'lar"a dokun ve listede Get Love Room\'u bul.') : 'Widget\'lar Android uygulamasıyla ana ekrana eklenir.')));
  b.append(h('div', { class: 'widgetgrid' }, ...WIDGETS.map((w) => h('div', { class: 'widgetcard' },
    h('img', { src: `assets/widgets/${w.kind}.png`, alt: '' }),
    h('b', {}, t(w.name)), h('small', {}, t(w.desc)),
    can ? h('button', { class: 'primary', onclick: () => { if (!app.pinWidget(w.kind)) toast(t('Bu telefon widget\'ı uygulamadan eklemeye izin vermiyor. Ana ekrandan ekleyebilirsin.'), 5000); } }, t('Ana ekrana ekle')) : null))));
  if (!app) b.append(h('button', { class: 'primary', html: `${icon('download')} ${t('Android uygulamasını indir')}`, onclick: () => openDownload() }));
}

/** Menüdeki "Uygulamayı telefona indir": uygulama şimdilik Google Play'de erken erişimde; Gmail adresi test listesine eklenmek üzere bize iletilir. */
export function openDownload() {
  const b = openSheet({ title: 'Uygulamayı telefona indir', iconName: 'download' });
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  b.append(h('p', {}, t('Android uygulamasıyla ana ekrana widget ekleyebilirsiniz: ortak tuvaliniz, evcil dostunuz ve ilişki saatiniz telefonun ekranında durur.')));
  if (ios) { b.append(h('p', { class: 'small' }, t('iPhone uygulaması henüz yok. Şimdilik Safari\'de Paylaş, sonra "Ana Ekrana Ekle" ile siteyi uygulama gibi açabilirsin.'))); return; }
  const KEY = 'lr.testReq';
  let sent = null;
  try { sent = localStorage.getItem(KEY); } catch { /* özel pencere */ }
  b.append(h('p', {}, t('Android uygulaması Google Play\'de şimdilik erken erişimde. Önce test listesine eklenmen gerekiyor.')));
  const email = h('input', { type: 'email', inputmode: 'email', autocomplete: 'email', maxlength: 120, placeholder: t('Gmail adresin'), value: sent || '' });
  const state = h('p', { class: 'note okbox', hidden: !sent }, t('Aldık! Listeye eklenince aşağıdaki bağlantıdan katılabilirsin.'));
  const send = h('button', { class: 'primary', onclick: async () => {
    const v = email.value.trim().toLowerCase();
    if (v.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return toast(t('Geçerli bir e-posta adresi yaz'));
    send.disabled = true;
    try {
      // Yanıt okunamaz (no-cors); ağ hatası olmazsa istek iletilmiş sayılır
      await fetch(REQUEST_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ email: v, lang: document.documentElement.lang || 'tr' }) });
      try { localStorage.setItem(KEY, v); } catch { /* özel pencere */ }
      state.hidden = false;
    } catch (e) { console.warn(e); toast(t('Gönderilemedi, tekrar dene')); }
    send.disabled = false;
  } }, t('Erken erişim iste'));
  b.append(h('div', { class: 'row grow' }, email, send), state,
    h('p', { class: 'small' }, t('Zaten listedeysen: bağlantıdan \'Test kullanıcısı ol\' de, sonra Google Play\'den indir.')),
    h('button', { html: `${icon('link')} ${t('Katılım bağlantısını aç')}`, onclick: () => { location.href = TEST_URL; } }),
    h('p', { class: 'small' }, t('Beklemek istemezsen uygulamayı dosya olarak da indirebilirsin.'), ' ', h('a', { href: APK_URL }, t('APK dosyasını indir'))));
}
