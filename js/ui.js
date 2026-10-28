// Ortak arayüz parçaları: DOM yardımcısı, çizgi ikonlar, alt pencere (sheet), bildirim, fotoğraf sıkıştırma.

export const $ = (id) => document.getElementById(id);

/** Küçük DOM üreticisi: h('button', {class:'x', onclick}, 'yazı', çocuk…) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el[k] = v;
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- İkonlar (24×24 çizgi ikonlar) ----------
const P = {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  micOff: '<path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V6a3 3 0 0 0-5.7-1.3M5 11a7 7 0 0 0 11.9 5M19 11a7 7 0 0 1-.6 2.8M12 18v3M3 3l18 18"/>',
  cam: '<rect x="2.5" y="6.5" width="13" height="11" rx="2.5"/><path d="m15.5 10.5 6-3.5v10l-6-3.5"/>',
  camOff: '<path d="M10 6.5h3.5a2.5 2.5 0 0 1 2.5 2.5v3.5M15.5 15v.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2H6M15.5 10.5l6-3.5v10M3 3l18 18"/>',
  screen: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4M12 7.5v6M9.5 10 12 7.5l2.5 2.5"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20Z"/>',
  hug: '<circle cx="8" cy="6.5" r="2.5"/><circle cx="16" cy="6.5" r="2.5"/><path d="M3.5 20v-3.5A4.5 4.5 0 0 1 8 12h8a4.5 4.5 0 0 1 4.5 4.5V20M7 15.5c2 1.6 8 1.6 10 0"/>',
  kiss: '<path d="M3 12c3-4 5.5-5 9-2.5C15.5 7 18 8 21 12c-3 3.5-6 5-9 5s-6-1.5-9-5Z"/><path d="M3 12h18"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  tv: '<rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="m8 2.5 4 3.5 4-3.5"/>',
  music: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3a9 9 0 0 1 9 9"/>',
  brush: '<path d="M14.5 4.5 19.5 9.5 11 18l-5-5ZM6 13c-2 0-3 1.5-3 3.5S2 20 2 20s4.5.5 6-1 1.5-3 1-4"/>',
  booth: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12.5" r="4"/><path d="M8 3v2.5M16 3v2.5"/>',
  album: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  jar: '<path d="M8 3h8M7 6h10M7 6c-1.5 1.5-2 3-2 5v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7c0-2-.5-3.5-2-5"/><path d="M10 13.5a2 2 0 1 1 3 1.7c-.6.4-1 .8-1 1.5M12 18.5v.01"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5Zm0 15A1.5 1.5 0 0 0 5.5 21H19v-3"/><path d="M8 7h7M8 10.5h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  game: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4M15 11.5h.01M18 13.5h.01"/>',
  paw: '<circle cx="6.5" cy="10" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="17.5" cy="10" r="2"/><path d="M8 17c0-3 2-5 4-5s4 2 4 5c0 2-2 2.5-4 2.5S8 19 8 17Z"/>',
  flower: '<circle cx="12" cy="8" r="2.5"/><path d="M12 5.5C11 2.5 13 2.5 12 5.5M14.5 8c3-1 3 1 0 0M9.5 8c-3-1-3 1 0 0M12 10.5c-1 3 1 3 0 0M12 10.5V21M12 17c-3 0-4.5-2-4.5-2M12 15c2.5 0 4-2 4-2"/>',
  badge: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  sofa: '<path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2.5 13a2 2 0 0 1 4 0v1.5h11V13a2 2 0 0 1 4 0v4.5h-19ZM5 17.5V20M19 17.5V20"/>',
  paint: '<path d="M19 11.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6.5h16Z"/><path d="M19 7.5h2v6l-9 1.5v2"/><rect x="10" y="17" width="4" height="4.5" rx="1"/>',
  pip: '<rect x="2.5" y="4" width="19" height="15" rx="2"/><rect x="12" y="11" width="7" height="5.5" rx="1"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  sound: '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4Z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
  play: '<path d="M7 4.5v15l12.5-7.5Z"/>',
  pause: '<path d="M7 4.5h3.5v15H7ZM13.5 4.5H17v15h-3.5Z"/>',
  next: '<path d="M5 5v14l10-7ZM18 5v14"/>',
  prev: '<path d="M19 5v14L9 12ZM6 5v14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/>',
  move: '<path d="M12 3v18M3 12h18M12 3 9 6M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0M12 19.5v.01"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4Z"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
};
export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? ''}</svg>`;
}
export const iconEl = (name, cls) => h('span', { class: 'icw', html: icon(name, cls) });

// ---------- Bildirim ----------
let toastT;
export function toast(msg, ms = 2800) {
  const t = $('toast');
  t.textContent = msg;
  t.style.opacity = 1;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.style.opacity = 0), ms);
}

// ---------- Alt pencere ----------
// Tek bir pencere: başlık + içerik. Açık olan özellik kapanınca kendi temizliğini yapar (onClose).
let closeHook = null;
export function openSheet({ title, iconName, wide = false, onClose = null }) {
  closeSheet();
  const m = $('sheet');
  m.querySelector('.card').className = `card sheet${wide ? ' wide' : ''}`;
  $('sheetTitle').innerHTML = (iconName ? icon(iconName) : '') + `<span>${esc(title)}</span>`;
  const body = $('sheetBody');
  body.innerHTML = '';
  // Koşullu parçalar (cond ? el : null) metin olarak "null" yazmasın
  body.append = (...kids) => Element.prototype.append.apply(body, kids.flat().filter((k) => k != null && k !== false));
  m.hidden = false;
  closeHook = onClose;
  return body;
}
export function closeSheet() {
  const m = $('sheet');
  if (!m || m.hidden) return;
  m.hidden = true;
  const f = closeHook;
  closeHook = null;
  f?.();
}
export const sheetOpen = () => !$('sheet').hidden;

// ---------- Fotoğraf ----------
/** Dosya seçtirir (kamera rulosu / bilgisayar). */
export function pickImage() {
  return new Promise((resolve) => {
    const i = h('input', { type: 'file', accept: 'image/*' });
    i.onchange = () => resolve(i.files[0] || null);
    i.click();
  });
}
/** Görseli küçültüp JPEG dataURL yapar (veritabanında az yer kaplasın). */
export async function compressImage(src, max = 360, q = 0.78) {
  const img = await loadImg(src instanceof Blob ? URL.createObjectURL(src) : src);
  const s = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const c = h('canvas', { width: Math.round((img.naturalWidth || img.width) * s), height: Math.round((img.naturalHeight || img.height) * s) });
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
export function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
export function download(dataUrl, name) {
  h('a', { href: dataUrl, download: name }).click();
}

export const fmtDate = (ms) => new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
export const fmtTime = (ms) => new Date(ms).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
