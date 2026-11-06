// Meyhane radyosu: bir adminin yapıştırdığı YouTube listesini meyhanedeki herkese aynı anda çalar; üstüne eski radyo
// hışırtısı ve plak çıtırtısı (Web Audio ile üretilir) eklenir, şarkı değişirken kısa bir istasyon arama sesi gelir.
//   admin/config/meyhane/radio = { list, index, at, by, name }   liste, çalan şarkının sırası ve başladığı sunucu anı
// Şarkı bitince ilk fark eden cihaz sıradakine geçirir (işlemle, bir kez); herkes aynı şarkının aynı saniyesini dinler.
import { db, ref, set, onValue, runTransaction, serverTimestamp, now } from '../fb.js';
import { h, openSheet, closeSheet, toast } from '../ui.js';
import { t } from '../i18n.js';
import { loadYT } from './tv.js';

const KEY = 'lr.radioOff';
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
  let off = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
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
      gain = ac.createGain(); gain.gain.value = off ? 0 : 0.05;
      noise.connect(bp).connect(gain).connect(ac.destination); noise.start();
    } catch { /* ses desteklenmiyor */ }
  }
  function stopNoise() { try { noise?.stop(); } catch { /* zaten durdu */ } noise = null; }
  function tune() { // istasyon arama: kısa süre hışırtı yükselir, ıslık gibi bir ses kayar
    if (!ac || off) return;
    try {
      const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(1800, n); o.frequency.exponentialRampToValueAtTime(400, n + 0.9);
      g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(0.04, n + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, n + 1);
      o.connect(g).connect(ac.destination); o.start(n); o.stop(n + 1.05);
      gain?.gain.setValueAtTime(0.18, n); gain?.gain.linearRampToValueAtTime(0.05, n + 1.2);
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
  /** Listenin şarkı kimlikleri (YouTube listeyi yükleyince verir). */
  async function loadList() {
    if (loaded === st.list && ids.length) return;
    yt.cuePlaylist({ listType: 'playlist', list: st.list });
    for (let i = 0; i < 40 && !(yt.getPlaylist?.() || []).length; i++) await new Promise((r) => setTimeout(r, 250));
    ids = yt.getPlaylist?.() || []; loaded = st.list;
  }
  let playing = '';
  async function apply() {
    if (!on || !st?.list) { yt?.stopVideo?.(); playing = ''; return; }
    await ensurePlayer();
    if (!ready) return;
    await loadList();
    if (!ids.length) return;
    const idx = ((st.index || 0) % ids.length + ids.length) % ids.length, key = `${st.list}|${idx}|${st.at}`;
    if (key !== playing) { playing = key; tune(); yt.loadVideoById({ videoId: ids[idx], startSeconds: expected() }); }
    yt.setVolume(off ? 0 : 70);
    if (body && document.body.contains(body)) render();
  }
  /** Şarkı bitti ya da atlandı: sıradakine geç (aynı şarkıyı iki kişi geçirmesin diye yalnızca sıra hâlâ aynıysa). */
  function next(from) {
    if (from == null || !ids.length) return;
    runTransaction(rRef, (v) => (v && v.index === from ? { ...v, index: (from + 1) % ids.length, at: now() } : undefined)).catch(() => {});
  }
  function watchSync() {
    clearInterval(syncT);
    syncT = setInterval(() => {
      if (!on || !ready || !playing || !ids.length) return;
      const exp = expected(), dur = yt.getDuration?.() || 0, cur = yt.getCurrentTime?.() || 0;
      if (dur && exp > dur + 3) return next(st.index); // kimse yokken şarkı bitmiş: sıradakine geç
      if (yt.getPlayerState?.() === 1 && Math.abs(cur - exp) > 4) yt.seekTo(exp, true); // kaydıysa düzelt
      if (yt.getPlayerState?.() !== 1 && yt.getPlayerState?.() !== 3 && !off) yt.playVideo();
    }, 4000);
  }

  function enter() {
    on = true;
    startNoise();
    stop ??= onValue(rRef, (s) => { st = s.val(); apply().catch((e) => console.warn('radyo', e)); }, () => {});
    watchSync();
  }
  function leave() { on = false; stop?.(); stop = null; clearInterval(syncT); yt?.stopVideo?.(); playing = ''; stopNoise(); }

  // ---------- Pencere ----------
  function setOff(v) {
    off = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* gizli sekme */ }
    if (gain) gain.gain.value = v ? 0 : 0.05;
    yt?.setVolume?.(v ? 0 : 70); if (!v) yt?.playVideo?.();
    render();
  }
  function render() {
    const b = body; b.innerHTML = '';
    const title = ready && playing ? yt.getVideoData?.().title || '' : '';
    const input = h('input', { placeholder: t('YouTube listesi linki (list=...)'), autocomplete: 'off', inputMode: 'url' });
    b.append(
      h('p', {}, st?.list ? (title ? t('Çalıyor: {title}', { title }) : t('Radyo açılıyor…')) : t('Radyoda henüz liste yok. Bir YouTube listesi linki yapıştır.')),
      st?.list ? h('p', { class: 'small' }, t('Listeyi açan: {name}', { name: st.name || '?' })) : null,
      h('div', { class: 'row wrap' },
        h('button', { onclick: () => setOff(!off) }, off ? t('Radyoyu aç (bende)') : t('Radyoyu kapat (bende)')),
        st?.list ? h('button', { onclick: () => next(st.index) }, t('Sonraki şarkı')) : null),
      h('form', { class: 'row', onsubmit: (e) => {
        e.preventDefault();
        const id = playlistId(input.value);
        if (!id) return toast(t('Bu bir YouTube listesi linki değil. Linkte list= olmalı.'));
        set(rRef, { list: id, index: 0, at: serverTimestamp(), by: ctx.uid, name: ctx.myName() }).then(() => { toast(t('Radyoda yeni liste çalıyor')); closeSheet(); }).catch(() => toast(t('Kaydedilemedi. Kurallar güncel mi?')));
      } }, input, h('button', { class: 'primary' }, t('Çal'))),
      h('p', { class: 'small' }, t('Liste meyhanedeki herkese aynı anda çalar. "Radyoyu kapat" yalnızca senin sesini kapatır.')),
    );
  }
  function open() {
    body = openSheet({ title: 'Radyo', iconName: 'music', onClose: () => (body = null) });
    ac?.resume?.(); // tarayıcının ses engeli: dokunuşla açılır
    render();
  }
  return { enter, leave, open };
}
