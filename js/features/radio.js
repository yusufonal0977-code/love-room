// Meyhane radyosu: YouTube listesini admin odasındaki ve meyhanedeki herkese aynı anda, durmadan çalar (varsayılan
// liste aşağıda; bir admin radyodan başka liste açabilir). Ses seviyesini herkes kendisi ayarlar (yalnızca kendi cihazında); üstüne eski radyo
// hışırtısı ve plak çıtırtısı (Web Audio ile üretilir) eklenir, şarkı değişirken kısa bir istasyon arama sesi gelir.
//   admin/config/meyhane/radio = { list, index, at, by, name }   liste, çalan şarkının sırası ve başladığı sunucu anı
// Şarkı bitince ilk fark eden cihaz sıradakine geçirir (işlemle, bir kez); herkes aynı şarkının aynı saniyesini dinler.
import { db, ref, set, onValue, runTransaction, serverTimestamp, now } from '../fb.js';
import { h, openSheet, closeSheet, toast } from '../ui.js';
import { t } from '../i18n.js';
import { loadYT } from './tv.js';

const KEY = 'lr.radioVol';
// Kullanıcının istediği liste (2026-11-07): veritabanında başka liste yoksa bu çalar
const DEFAULT_LIST = 'PLzGj5zROpZrS9PyJXzZASw_0GBZlUZ8Er';
/** YouTube listesi linkinden liste kimliği (list=...). */
export function playlistId(raw) {
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : 'https://' + raw.trim());
    const id = u.searchParams.get('list');
    return id && /^[\w-]{10,}$/.test(id) ? id : null;
  } catch { return null; }
}

export function createRadio(ctx) {
  const rRef = ref(db, 'admin/config/meyhane/radio');
  let st = null, stop = null, on = false, yt = null, ready = false, ids = [], loaded = '', syncT = null, body = null;
  let vol = (() => { try { const v = localStorage.getItem(KEY); return v == null ? 60 : Math.max(0, Math.min(100, +v || 0)); } catch { return 60; } })();
  const hiss = () => 0.05 * (vol / 60); // hışırtı müzikle birlikte kısılır
  const host = h('div', { class: 'radiohost' }, h('div', { id: 'radioPlayer' }));
  document.body.append(host);

  // ---------- Eski radyo sesi: hışırtı + çıtırtı, şarkı geçişinde istasyon arama ----------
  let ac = null, noise = null, gain = null;
  function startNoise() {
    try {
      ac ??= new AudioContext();
      ac.resume?.();
      if (noise) return;
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * 0.35; // hışırtı
        if (Math.random() < 0.0004) for (let k = 0; k < 40 && i + k < len; k++) d[i + k] += (Math.random() * 2 - 1) * (1 - k / 40) * 1.6; // çıtırtı
      }
      noise = ac.createBufferSource(); noise.buffer = buf; noise.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.6;
      gain = ac.createGain(); gain.gain.value = hiss();
      noise.connect(bp).connect(gain).connect(ac.destination); noise.start();
    } catch { /* ses desteklenmiyor */ }
  }
  function stopNoise() { try { noise?.stop(); } catch { /* zaten durdu */ } noise = null; }
  function tune() { // istasyon arama: kısa süre hışırtı yükselir, ıslık gibi bir ses kayar
    if (!ac || !vol) return;
    try {
      const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(1800, n); o.frequency.exponentialRampToValueAtTime(400, n + 0.9);
      g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(0.04, n + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, n + 1);
      o.connect(g).connect(ac.destination); o.start(n); o.stop(n + 1.05);
      gain?.gain.setValueAtTime(hiss() * 3.5, n); gain?.gain.linearRampToValueAtTime(hiss(), n + 1.2);
    } catch { /* yok say */ }
  }

  // ---------- YouTube ----------
  const expected = () => Math.max(0, (now() - (st?.at || now())) / 1000);
  async function ensurePlayer() {
    if (yt) return;
    const YT = await loadYT();
    await new Promise((res) => {
      yt = new YT.Player('radioPlayer', {
        width: 320, height: 180,
        playerVars: { listType: 'playlist', list: st.list, autoplay: 0, playsinline: 1, rel: 0 },
        events: { onReady: () => { ready = true; res(); }, onStateChange: (e) => { if (e.data === 0) next(st?.index); } },
      });
    });
  }
  /** Listenin şarkı kimlikleri (YouTube listeyi yükleyince verir); sıradaki şarkıyı hesaplamak için. */
  async function readList() {
    for (let i = 0; i < 40 && !(yt.getPlaylist?.() || []).length; i++) await new Promise((r) => setTimeout(r, 250));
    ids = yt.getPlaylist?.() || []; loaded = st.list;
  }
  let playing = '';
  async function apply() {
    if (!on || !st?.list) { yt?.stopVideo?.(); playing = ''; return; }
    if (!vol) { yt?.pauseVideo?.(); return; } // sesi sıfıra çeken için hiç çalmaz (veri harcamaz)
    await ensurePlayer();
    if (!ready) return;
    if (loaded !== st.list) ids = [];
    const idx = ids.length ? ((st.index || 0) % ids.length + ids.length) % ids.length : st.index || 0, key = `${st.list}|${idx}|${st.at}`;
    // Not: cuePlaylist'ten sonra loadVideoById takılıp "yükleniyor"da kalıyor (sessiz hata); listeyi sırasıyla açmak çalışıyor
    if (key !== playing) { playing = key; tune(); yt.loadPlaylist({ listType: 'playlist', list: st.list, index: idx, startSeconds: expected() }); readList(); }
    yt.setVolume(vol);
    if (body && document.body.contains(body)) render();
  }
  /** Şarkı bitti ya da atlandı: sıradakine geç (aynı şarkıyı iki kişi geçirmesin diye yalnızca sıra hâlâ aynıysa). */
  function next(from) {
    if (from == null || !ids.length) return;
    // Kayıt hiç yoksa (varsayılan liste) ilk geçiren kaydı da oluşturur
    runTransaction(rRef, (v) => (v && v.index === from ? { ...v, index: (from + 1) % ids.length, at: now() } : undefined)).catch(() => {});
  }
  function watchSync() {
    clearInterval(syncT);
    syncT = setInterval(() => {
      if (!on || !ready || !playing || !ids.length) return;
      const exp = expected(), dur = yt.getDuration?.() || 0, cur = yt.getCurrentTime?.() || 0;
      if ((dur && exp > dur + 3) || exp > 3 * 3600) return next(st.index); // kimse yokken şarkı bitmiş: sıradakine geç
      if (yt.getPlayerState?.() === 1 && Math.abs(cur - exp) > 4) yt.seekTo(exp, true); // kaydıysa düzelt
      if (yt.getPlayerState?.() !== 1 && yt.getPlayerState?.() !== 3 && vol) yt.playVideo();
    }, 4000);
  }

  function enter() {
    on = true;
    startNoise();
    stop ??= onValue(rRef, (s) => {
      st = s.val();
      // Henüz kayıt yoksa ilk gelen varsayılan listeyi başlatır (herkes aynı andan dinlesin diye kayıt ortak)
      if (!st) { runTransaction(rRef, (v) => v ?? { list: DEFAULT_LIST, index: 0, at: now(), name: 'Eclip' }).catch(() => {}); return; }
      apply().catch((e) => console.warn('radyo', e));
    }, () => {});
    watchSync();
  }
  function leave() { on = false; stop?.(); stop = null; clearInterval(syncT); yt?.stopVideo?.(); playing = ''; stopNoise(); }

  // ---------- Pencere ----------
  /** Ses seviyesi yalnızca bu cihazda; 0 radyoyu bu kişi için durdurur. */
  function setVol(v) {
    const was = vol;
    vol = Math.max(0, Math.min(100, Math.round(v)));
    try { localStorage.setItem(KEY, String(vol)); } catch { /* gizli sekme */ }
    if (gain) gain.gain.value = hiss();
    yt?.setVolume?.(vol);
    if (!was && vol) { playing = ''; apply().catch(() => {}); } else if (!vol) yt?.pauseVideo?.();
  }
  function render() {
    const b = body; b.innerHTML = '';
    const title = ready && playing ? yt.getVideoData?.().title || '' : '';
    const volTxt = h('b', {}, vol ? `%${vol}` : t('kapalı'));
    const input = h('input', { placeholder: t('YouTube listesi linki (list=...)'), autocomplete: 'off', inputMode: 'url' });
    b.append(
      h('p', {}, st?.list ? (title ? t('Çalıyor: {title}', { title }) : t('Radyo açılıyor…')) : t('Radyoda henüz liste yok. Bir YouTube listesi linki yapıştır.')),
      st?.list ? h('p', { class: 'small' }, t('Listeyi açan: {name}', { name: st.name || '?' })) : null,
      h('div', { class: 'row wrap' },
        st?.list ? h('button', { onclick: () => next(st.index) }, t('Sonraki şarkı')) : null),
      h('label', { class: 'radiovol' }, h('span', {}, t('Ses (yalnızca sende)')), h('input', { type: 'range', min: 0, max: 100, value: vol, oninput: (e) => { setVol(+e.target.value); volTxt.textContent = vol ? `%${vol}` : t('kapalı'); } }), volTxt),
      h('form', { class: 'row', onsubmit: (e) => {
        e.preventDefault();
        const id = playlistId(input.value);
        if (!id) return toast(t('Bu bir YouTube listesi linki değil. Linkte list= olmalı.'));
        set(rRef, { list: id, index: 0, at: serverTimestamp(), by: ctx.uid, name: ctx.myName() }).then(() => { toast(t('Radyoda yeni liste çalıyor')); closeSheet(); }).catch(() => toast(t('Kaydedilemedi. Kurallar güncel mi?')));
      } }, input, h('button', { class: 'primary' }, t('Çal'))),
      h('p', { class: 'small' }, t('Liste admin odasında ve meyhanede herkese aynı anda çalar. Ses ayarı yalnızca seni etkiler; sıfıra çekersen sende durur.')),
    );
  }
  function open() {
    body = openSheet({ title: 'Radyo', iconName: 'music', onClose: () => (body = null) });
    ac?.resume?.(); // tarayıcının ses engeli: dokunuşla açılır
    render();
  }
  return { enter, leave, open, get on() { return on; } };
}
