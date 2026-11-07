// Telefon uygulaması (Android) ile köprü. Uygulama siteyi açar ve window.LoveRoomApp'i verir; widget'lar (ortak tuval,
// evcil dostumuz, ilişki saatimiz) uygulama kapalıyken Firebase'den kendileri okur. Burada site uygulamaya oturumu,
// hayvanın piksel resmini ve "bir şey değişti, widget'ları yenile" haberini verir. Tarayıcıda hiçbir şey yapmaz.
import { auth, onValue } from '../fb.js';
import { petSprites } from '../art.js';
import { h, icon, openSheet, toast } from '../ui.js';
import { t } from '../i18n.js';

export const inApp = () => !!window.LoveRoomApp;
export const APK_URL = 'https://github.com/yusufonal0977-code/love-room/releases/download/android/GetLoveRoom.apk';

export function connectApp(ctx, { rid, care, draw, life, spotify }) {
  const app = window.LoveRoomApp;
  // Widget'a dokununca uygulama ilgili pencereyi açtırır
  const actions = { draw: () => draw.open(), pet: () => care.openPet(), clock: () => life.openClock(), music: () => spotify?.open() };
  window.__lrAction = (ac) => actions[ac]?.();
  const ac = new URLSearchParams(location.search).get('ac');
  if (ac) setTimeout(() => window.__lrAction(ac), 900);
  if (!app) return;
  const send = () => app.session(JSON.stringify({ rid, uid: ctx.uid, refreshToken: auth.currentUser?.refreshToken || '', lang: document.documentElement.lang }));
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
  if (!app) b.append(h('button', { class: 'primary', html: `${icon('download')} ${t('Android uygulamasını indir')}`, onclick: () => { location.href = APK_URL; } }));
}

/** Menüdeki "Uygulamayı telefona indir": Android'de APK, iPhone'da ana ekrana ekleme yolu. */
export function openDownload() {
  const b = openSheet({ title: 'Uygulamayı telefona indir', iconName: 'download' });
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  b.append(
    h('p', {}, t('Android uygulamasıyla ana ekrana widget ekleyebilirsiniz: ortak tuvaliniz, evcil dostunuz ve ilişki saatiniz telefonun ekranında durur.')),
    ios ? h('p', { class: 'small' }, t('iPhone uygulaması henüz yok. Şimdilik Safari\'de Paylaş, sonra "Ana Ekrana Ekle" ile siteyi uygulama gibi açabilirsin.'))
      : h('button', { class: 'primary', html: `${icon('download')} ${t('Android uygulamasını indir')}`, onclick: () => { location.href = APK_URL; } }),
    ios ? null : h('p', { class: 'small' }, t('İndirdikten sonra dosyayı aç. Telefon "bilinmeyen kaynak" izni isterse bu uygulama için izin ver. Google Play\'e yakında gelecek.')),
  );
}
