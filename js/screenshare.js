// Ekran yansıtma (Discord'daki "Yayına geç" gibi): yayından önce kalite seçilir, yayın sırasında değiştirilebilir.
// İzleyen tarafta ekranın üstünde CANLI etiketi, çözünürlük/fps, ses ayarı, tam ekran ve pencere içinde izleme vardır.
import { h, icon, openSheet, closeSheet } from './ui.js';
import { t } from './i18n.js';

export const QUALITIES = {
  '720p30': { label: '720p · 30 fps', height: 720, fps: 30, bitrate: 2_500_000 },
  '1080p30': { label: '1080p · 30 fps', height: 1080, fps: 30, bitrate: 4_500_000 },
  '1080p60': { label: '1080p · 60 fps', height: 1080, fps: 60, bitrate: 8_000_000 },
};
// motion: film/oyun (akıcılık öncelikli), detail: yazı/kod/slayt (netlik öncelikli)
export const MODES = { motion: 'Film / oyun (akıcı)', detail: 'Yazı / kod (net)' };
const KEY = 'lr.shareQuality';

export function savedOpts() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { q: QUALITIES[o.q] ? o.q : '1080p30', mode: MODES[o.mode] ? o.mode : 'motion' };
  } catch { return { q: '1080p30', mode: 'motion' }; }
}
function saveOpts(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* gizli sekme */ } }

/** Yayından önce kalite penceresi. Vazgeçilirse null döner. */
export function pickQuality() {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; resolve(v); };
    const b = openSheet({ title: 'Ekranını yansıt', iconName: 'screen', onClose: () => finish(null) });
    const o = savedOpts();
    const group = (title, items, cur, set) => h('div', { class: 'sharepick' }, h('small', {}, t(title)),
      h('div', { class: 'row wrap' }, ...Object.entries(items).map(([k, v]) => h('button', {
        class: k === cur ? 'sel' : '', onclick: (e) => { set(k); e.currentTarget.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === e.currentTarget)); },
      }, t(typeof v === 'string' ? v : v.label)))));
    b.append(
      group('Kalite', QUALITIES, o.q, (k) => (o.q = k)),
      group('İçerik', MODES, o.mode, (k) => (o.mode = k)),
      h('p', { class: 'small' }, t('Film için "Sekme"yi seçip "Sekme sesini de paylaş"ı işaretle. Yavaş internette 720p daha akıcı olur.')),
      h('button', { class: 'primary', html: `${icon('screen')} ${t('Yayına başla')}`, onclick: () => { saveOpts(o); finish(o); closeSheet(); } }),
    );
  });
}

/** Seçilen kaliteyle ekranı yakalar. Vazgeçilirse ya da izin yoksa hata fırlatır. */
export async function capture(opts) {
  const q = QUALITIES[opts.q];
  const s = await navigator.mediaDevices.getDisplayMedia({
    video: { height: { ideal: q.height }, frameRate: { ideal: q.fps, max: q.fps } },
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    systemAudio: 'include', surfaceSwitching: 'include', selfBrowserSurface: 'exclude',
  });
  hint(s, opts);
  return s;
}
function hint(s, opts) {
  const v = s.getVideoTracks()[0];
  if (v) v.contentHint = opts.mode === 'detail' ? 'detail' : 'motion';
  const a = s.getAudioTracks()[0];
  if (a) a.contentHint = 'music';
}
/** Yayın sürerken kaliteyi değiştirir (yeniden seçim istemeden). */
export async function retune(s, opts) {
  const q = QUALITIES[opts.q], v = s?.getVideoTracks()[0];
  if (!v) return;
  await v.applyConstraints({ height: { ideal: q.height }, frameRate: { ideal: q.fps, max: q.fps } }).catch(() => {});
  hint(s, opts);
}
/** Gönderen kanala bit hızı ve öncelik verir. */
export async function tune(sender, opts) {
  if (!sender?.track) return;
  const q = QUALITIES[opts.q];
  try {
    const p = sender.getParameters();
    p.encodings = p.encodings?.length ? p.encodings : [{}];
    Object.assign(p.encodings[0], { maxBitrate: q.bitrate, maxFramerate: q.fps, scaleResolutionDownBy: 1, priority: 'high', networkPriority: 'high' });
    p.degradationPreference = opts.mode === 'detail' ? 'maintain-resolution' : 'maintain-framerate';
    await sender.setParameters(p);
  } catch { /* bazı tarayıcılar desteklemez */ }
}

/**
 * Ekranın üstündeki yayın çubuğu. host: ekran kutusu, getVideo(): görüntünün oynadığı öğe (değişebilir).
 * info(): { name, isMe, viewers? } ya da null (yayın yoksa gizlenir).
 */
export function liveOverlay(host, getVideo, { info, onStop, onRetune, onVolume, onFull }) {
  let fps = 0, frames = 0, lastT = performance.now(), vol = 1, uiOpen = false, counted = null;
  const badge = h('span', { class: 'livebadge' }, t('CANLI'));
  const who = h('span', { class: 'livewho' });
  const stats = h('span', { class: 'livestats' });
  const volIn = h('input', { type: 'range', min: 0, max: 100, value: 100, title: t('Yayın sesi'), oninput: () => { vol = volIn.value / 100; onVolume?.(vol); } });
  const qSel = h('select', { title: t('Kalite'), onchange: () => onRetune?.({ ...savedOpts(), q: qSel.value }) },
    ...Object.entries(QUALITIES).map(([k, v]) => h('option', { value: k }, v.label)));
  const btns = h('div', { class: 'livebtns' },
    h('label', { class: 'livevol' }, h('span', { html: icon('sound') }), volIn),
    qSel,
    h('button', { title: t('Pencere içinde izle'), html: icon('tv'), onclick: (e) => { e.stopPropagation(); pip(); } }),
    h('button', { title: t('Tam ekran'), html: icon('full'), onclick: (e) => { e.stopPropagation(); onFull?.(); } }),
    h('button', { class: 'danger', onclick: (e) => { e.stopPropagation(); onStop?.(); } }, t('Yayını durdur')));
  const bar = h('div', { class: 'livebar', hidden: true, onclick: (e) => { e.stopPropagation(); uiOpen = !uiOpen; bar.classList.toggle('open', uiOpen); } },
    h('div', { class: 'livetop' }, badge, who, stats), btns);
  host.append(bar);

  // Gerçekten ekrana gelen kare sayısı (izleyenin gördüğü fps)
  const watchFrames = (v) => {
    if (counted === v || !v.requestVideoFrameCallback) return;
    counted = v;
    const count = () => { if (counted !== v) return; frames++; v.requestVideoFrameCallback(count); };
    v.requestVideoFrameCallback(count);
  };
  setInterval(() => {
    const i = info(), video = getVideo();
    bar.hidden = !i || !video?.srcObject;
    if (bar.hidden) return;
    watchFrames(video);
    const n = performance.now();
    if (video.requestVideoFrameCallback) { fps = Math.round(frames * 1000 / (n - lastT)); frames = 0; lastT = n; }
    else fps = Math.round(video.srcObject.getVideoTracks()[0]?.getSettings().frameRate || 0);
    who.textContent = i.isMe ? t('Sen yayındasın') : i.name || '';
    stats.textContent = [video.videoHeight ? `${video.videoHeight}p` : '', fps ? `${fps} fps` : '', i.viewers ? t('{n} izleyici', { n: i.viewers }) : ''].filter(Boolean).join(' · ');
    btns.querySelector('.danger').hidden = !i.isMe;
    qSel.hidden = !i.isMe;
    if (i.isMe) qSel.value = savedOpts().q;
    btns.querySelector('.livevol').hidden = !!i.isMe; // kendi yayınının sesini duymaz
  }, 1000);
  async function pip() {
    const video = getVideo();
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await video.requestPictureInPicture(); } catch { /* desteklenmiyor */ }
  }
  return { volume: () => vol };
}

/** Kalite değişikliği: kaydet, yakalamayı ve kodlamayı güncelle. */
export async function changeQuality(stream, opts, senders) {
  saveOpts(opts);
  await retune(stream, opts);
  for (const s of senders) await tune(s, opts);
}
