// Çok dilli metinler. Kaynak dil Türkçe: koddaki Türkçe cümle aynı zamanda anahtardır;
// diğer diller js/i18n/<dil>.js içinde { 'Türkçe cümle': 'çeviri' } olarak durur. Eksik çeviri Türkçe görünmez,
// İngilizceye düşer. Değişkenler {ad} biçiminde: t('{name} geldi', { name }).

export const LANGS = [
  ['tr', 'Türkçe'], ['en', 'English'], ['es', 'Español'], ['de', 'Deutsch'], ['fr', 'Français'], ['pt', 'Português'],
];
const LOCALES = { tr: 'tr-TR', en: 'en-US', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', pt: 'pt-BR' };

function detect() {
  for (const l of navigator.languages || [navigator.language || 'en']) {
    const k = String(l).slice(0, 2).toLowerCase();
    if (LANGS.some(([c]) => c === k)) return k;
  }
  return 'en';
}
let saved = null;
try { saved = localStorage.getItem('lr.lang'); } catch { /* gizli sekme */ }
export const lang = LANGS.some(([c]) => c === saved) ? saved : detect();
export const locale = LOCALES[lang];

let dict = {}, fallback = {};
/** Açılışta bir kez: seçili dilin sözlüğünü yükler ve sayfadaki sabit metinleri çevirir. */
export async function initI18n() {
  document.documentElement.lang = lang;
  if (lang !== 'tr') {
    dict = (await import(`./i18n/${lang}.js`)).default;
    if (lang !== 'en') fallback = (await import('./i18n/en.js')).default;
  }
  translateDom(document);
}

export function t(s, vars) {
  let r = lang === 'tr' ? s : dict[s] ?? fallback[s] ?? s;
  if (vars) r = r.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return r;
}

/** data-t: içerik (HTML olabilir), data-tp: placeholder, data-tt: title. Anahtar, elemandaki Türkçe metindir. */
export function translateDom(root) {
  if (lang === 'tr') return;
  if (root === document) document.title = t(document.title);
  root.querySelectorAll('[data-t]').forEach((el) => { el.innerHTML = t(el.innerHTML.trim()); });
  root.querySelectorAll('[data-tp]').forEach((el) => { el.placeholder = t(el.placeholder); });
  root.querySelectorAll('[data-tt]').forEach((el) => { el.title = t(el.title); });
}

export function setLang(code) {
  try { localStorage.setItem('lr.lang', code); } catch { /* yok say */ }
  location.reload();
}

/** Dil seçici: <select> */
export function langPicker() {
  const s = document.createElement('select');
  s.className = 'langpick';
  s.setAttribute('aria-label', 'Language');
  for (const [c, name] of LANGS) s.append(new Option(name, c, c === lang, c === lang));
  s.onchange = () => setLang(s.value);
  return s;
}
