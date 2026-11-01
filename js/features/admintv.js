// Admin odasının TV'si: veri ekranı ile normal TV arasında geçiş; herkes aynı anı izler.
//
// Oda tek ve ortak olduğu için ekran da ortaktır:
//   admin/config/tv = { mode: 'stats'|'tv', kind: 'yt'|'file'|'web'|'screen', src, start, at, by, name, playing, pos, posAt }
//   • YouTube ve video dosyası: durdurma/başlatma/sarma herkese yansır, kayma kendiliğinden düzelir.
//   • Web sitesi: tarayıcılar başka sitenin içindeki sayfayı eşitlemeye izin vermez; herkes sayfayı kendi gezer.
//     Birebir aynı görüntü için "Ekranımı yansıt": yansıtan adminin ekranı odadaki herkesin TV'sine gelir (adminvoice.js).
// Odadaki küçük ekran doğrudan kullanılır; kumanda yandaki tuşla açılır, "Büyüt" aynı ekranı tam ekran yapar.
// Bazı siteler (Google, Instagram vb.) başka sitenin içinde açılmayı engeller: onlar için "Yeni sekmede aç" var.
import { h, icon, openSheet, closeSheet, toast } from '../ui.js';
import { db, ref, set, update, onValue, serverTimestamp, now } from '../fb.js';
import { W, H } from '../scenes.js';
import { t } from '../i18n.js';
import { parseLink, loadYT } from './tv.js';

const YT_ID = /^[\w-]{6,}$/;
const webUrl = (v) => (v.kind === 'yt' ? `https://www.youtube.com/watch?v=${v.src}` : v.src);
// Yerel denemede (?tvdeneme) canlı odadaki adminlerin ekranı değişmesin diye ayrı kayıt kullanılır
const DENEME = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('tvdeneme');

export function createAdminTv(ctx, { rect, onMode, statsSheet, voice }) {
  const tvRef = ref(db, DENEME ? 'admin/config/tvtest' : 'admin/config/tv');
  let tv = {}, stop = null, inRoom = false, full = false, shownKey = null, sheetBody = null;
  let player = null, syncTimer = null, applyingUntil = 0, started = false, lastCur = 0, share = null, screenVid = null;

  const content = h('div', { class: 'admscreen-in' });
  const soundBtn = h('button', { class: 'admsound', hidden: true, onclick: () => { player?.unmute(); soundBtn.hidden = true; } }, 'Sesi aç');
  const bar = h('div', { class: 'admscreen-bar' },
    h('button', { onclick: () => setFull(false) }, 'Küçült'),
    h('button', { onclick: () => openOutside() }, 'Yeni sekmede aç'));
  const box = h('div', { class: 'admscreen', hidden: true }, content, soundBtn, bar);
  document.getElementById('tvLayer').append(box);

  // Geçiş tuşu: veri ekranı <-> normal TV; kumanda yalnızca normal TV'deyken
  const btn = h('button', { onclick: toggle });
  const remote = h('button', { hidden: true, onclick: () => open() }, 'Kumanda');
  const btns = h('div', { class: 'admintvbtns', hidden: true }, remote, btn);
  document.body.append(btns);

  const mode = () => (tv.mode === 'tv' ? 'tv' : 'stats');
  const saveFail = () => toast(t('Kaydedilemedi. Kurallar güncel mi?'));
  function openOutside() { if (tv.src) window.open(webUrl(tv), '_blank', 'noopener'); }
  function setFull(on) {
    full = on; box.classList.toggle('full', on);
    document.getElementById('tvLayer').style.zIndex = on ? '40' : ''; // oyunun çubukları sitenin üstünde kalmasın
    place();
  }
  function toggle() {
    const next = mode() === 'tv' ? 'stats' : 'tv';
    update(tvRef, { mode: next }).catch(saveFail);
    if (next === 'tv' && !tv.src && tv.kind !== 'screen') open();
  }
  function play(raw) {
    const link = parseLink(raw);
    if (!link) return toast(t('Bu link geçerli görünmüyor.'));
    stopShare(false);
    return set(tvRef, { mode: 'tv', kind: link.kind, src: link.src, start: link.start || 0, at: serverTimestamp(), by: ctx.uid, playing: true, pos: link.start || 0, posAt: serverTimestamp() })
      .then(() => toast(t('TV\'de açıldı.'))).catch(saveFail);
  }

  // ---------- Ekran yansıtma ----------
  async function startShare() {
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      share = s; voice.setShare(s);
      s.getVideoTracks()[0].onended = () => stopShare(true);
      await set(tvRef, { mode: 'tv', kind: 'screen', by: ctx.uid, name: ctx.myName(), at: serverTimestamp() });
      closeSheet();
    } catch (e) { if (e?.name !== 'NotAllowedError') toast(t('Ekran yansıtılamadı.')); }
  }
  function stopShare(clear) {
    if (!share) return;
    share.getTracks().forEach((x) => x.stop()); share = null; voice.setShare(null);
    if (clear && tv.kind === 'screen' && tv.by === ctx.uid) set(tvRef, { mode: 'tv' }).catch(() => {});
  }

  // ---------- Eşitleme (YouTube ve video dosyası) ----------
  /** Şu an herkesin olması gereken saniye. */
  function expected() {
    const base = tv.pos ?? tv.start ?? 0;
    if (tv.playing === false) return base;
    return base + Math.max(0, (now() - (tv.posAt ?? tv.at ?? now())) / 1000);
  }
  const hold = () => { applyingUntil = performance.now() + 1500; };
  /** Kendi cihazını ortak duruma getirir; bu sırada oluşan olaylar başkalarına yayınlanmaz. */
  function applySync() {
    if (!player?.ready) return;
    const want = tv.playing !== false, exp = expected(), dur = player.duration(), cur = player.current();
    // Konum hem son bilinenden hem ortak konumdan koptuysa kullanıcı sarmıştır: geri alma, herkese duyur
    if (started && performance.now() >= applyingUntil && Math.abs(cur - lastCur) > 3 && Math.abs(cur - exp) > 3) {
      lastCur = cur;
      hold();
      update(tvRef, { playing: player.playing() || tv.playing !== false, pos: cur, posAt: serverTimestamp() }).catch(() => {});
      return;
    }
    if (dur && exp >= dur) return; // yayın bitti
    if (Math.abs(cur - exp) > 1.5) { hold(); player.seek(exp); lastCur = exp; } // kendi düzeltmemiz atlama sayılmaz
    if (want && !player.playing()) { hold(); player.play(); } else if (!want && player.playing()) { hold(); player.pause(); }
  }
  /** Bu cihazda biri oynat/durdur/sar yaptı: herkese duyur. Takılmadan dönen oynatma atlama sayılmaz. */
  function onLocal() {
    if (!player?.ready || performance.now() < applyingUntil) return;
    const cur = player.current(), isOn = player.playing();
    if (isOn) started = true;
    if (!started) return;
    const wasOn = tv.playing !== false;
    if (!isOn && !player.paused()) return; // yükleniyor ya da geçiş anı: durdurma değil
    // Sarma: hem ortak konumdan hem son konumdan uzaksa. Takılıp kalan oynatma yalnızca ortak konumdan uzaktır, yayınlanmaz.
    const jumped = Math.abs(cur - lastCur) > 3 && Math.abs(cur - expected()) > 3;
    if (isOn === wasOn && !jumped) return;
    lastCur = cur;
    update(tvRef, { playing: isOn, pos: cur, posAt: serverTimestamp() }).catch(() => {});
  }
  function startSync() {
    clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      if (!player?.ready) return;
      applySync();
      lastCur = player.current();
      if (player.playing()) started = true;
      // Tarayıcı sesli otomatik oynatmayı engellediyse sessiz başlat, "Sesi aç" göster
      else if (!started && tv.playing !== false && player.mute) { player.mute(); player.play(); soundBtn.hidden = false; }
    }, 1000);
  }
  function destroyPlayer() {
    clearInterval(syncTimer); syncTimer = null;
    try { player?.destroy?.(); } catch { /* zaten kapalı */ }
    player = null; started = false; soundBtn.hidden = true; screenVid = null;
  }
  async function buildYt(host) {
    const YT = await loadYT();
    const key = shownKey;
    const el = h('div'); host.append(el);
    const p = { ready: false };
    const yt = new YT.Player(el, {
      videoId: tv.src, width: '100%', height: '100%',
      playerVars: { autoplay: 1, start: Math.floor(expected()), playsinline: 1, rel: 0, origin: location.origin },
      events: {
        onReady: () => { if (key !== shownKey) return; p.ready = true; hold(); applySync(); },
        onStateChange: () => { if (key === shownKey) onLocal(); },
      },
    });
    Object.assign(p, {
      current: () => yt.getCurrentTime?.() || 0, duration: () => yt.getDuration?.() || 0,
      playing: () => yt.getPlayerState?.() === 1, paused: () => yt.getPlayerState?.() === 2,
      seek: (s) => yt.seekTo(s, true), play: () => yt.playVideo(), pause: () => yt.pauseVideo(),
      mute: () => yt.mute(), unmute: () => { yt.unMute(); yt.setVolume(100); }, destroy: () => yt.destroy(),
    });
    if (key === shownKey) { player = p; startSync(); } else yt.destroy();
  }
  function buildFile() {
    const v = h('video', { src: tv.src, autoplay: true, playsInline: true, controls: true });
    const p = {
      ready: false, current: () => v.currentTime || 0, duration: () => v.duration || 0, playing: () => !v.paused && !v.ended,
      paused: () => v.paused, seek: (s) => { v.currentTime = s; }, play: () => v.play().catch(() => {}), pause: () => v.pause(),
      mute: () => { v.muted = true; }, unmute: () => { v.muted = false; }, destroy: () => { v.pause(); v.removeAttribute('src'); },
    };
    v.onloadedmetadata = () => { p.ready = true; hold(); applySync(); };
    v.onplay = v.onpause = v.onseeked = onLocal;
    content.append(v);
    player = p; startSync();
  }

  /** Ekranın içeriğini kurar; aynı yayın için baştan yüklemez. */
  function build() {
    const show = inRoom && mode() === 'tv';
    const key = show ? `${tv.kind}|${tv.src}|${tv.by}|${tv.at}` : '';
    box.hidden = !show;
    if (!show && full) setFull(false);
    if (key !== shownKey) {
      shownKey = key;
      destroyPlayer();
      content.innerHTML = '';
      if (show) {
        if (tv.kind === 'screen') {
          screenVid = h('video', { autoplay: true, playsInline: true, muted: true });
          content.append(screenVid);
        } else if (!tv.src) content.append(h('p', { class: 'admscreen-idle' }, t('Kanal yok. Kumandadan bir link yapıştır.')));
        else if (tv.kind === 'yt') { if (YT_ID.test(tv.src)) buildYt(content); }
        else if (tv.kind === 'file') buildFile();
        else {
          const f = document.createElement('iframe');
          f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          f.referrerPolicy = 'no-referrer'; // yalnızca sitelerde: YouTube adres ister (yoksa Hata 153)
          f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
          f.src = tv.src;
          content.append(f);
        }
      }
    }
    if (show && player) applySync();
  }
  function refreshUi() {
    btns.hidden = !inRoom;
    remote.hidden = mode() !== 'tv';
    btn.textContent = t(mode() === 'tv' ? 'Veri ekranı' : 'Normal TV');
    onMode(mode());
    build();
    if (sheetBody && document.body.contains(sheetBody)) renderSheet();
  }
  /** Her karede: küçük ekranı odadaki TV'nin üstünde tutar; yansıtma görüntüsü gelince bağlar. */
  function place() {
    if (box.hidden) return;
    if (screenVid && !screenVid.srcObject) {
      const s = tv.by === ctx.uid ? share : voice.screenOf(tv.by);
      if (s) { screenVid.srcObject = s; screenVid.play().catch(() => {}); }
    }
    if (full) { Object.assign(box.style, { left: '0', top: '0', width: '100%', height: '100%' }); return; }
    const r = ctx.game.canvas.getBoundingClientRect(), [x, y, w, hh] = rect;
    Object.assign(box.style, { left: r.left + (x / W) * r.width + 'px', top: r.top + (y / H) * r.height + 'px', width: (w / W) * r.width + 'px', height: (hh / H) * r.height + 'px' });
  }

  // ---------- Kumanda ----------
  function renderSheet() {
    const b = sheetBody;
    b.innerHTML = '';
    const input = h('input', { placeholder: 'Link yapıştır (YouTube, video ya da site)', autocomplete: 'off', enterKeyHint: 'go' });
    const canShare = !!navigator.mediaDevices?.getDisplayMedia;
    b.append(
      h('div', { class: 'tabs' },
        h('button', { class: mode() === 'stats' ? 'sel' : '', onclick: () => mode() === 'stats' || toggle() }, 'Veri ekranı'),
        h('button', { class: mode() === 'tv' ? 'sel' : '', onclick: () => mode() === 'tv' || toggle() }, 'Normal TV')),
      h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (input.value.trim()) play(input.value); } }, input, h('button', { class: 'primary' }, 'Aç')),
      canShare ? h('div', { class: 'row wrap' }, share
        ? h('button', { class: 'danger', onclick: () => stopShare(true) }, 'Yansıtmayı durdur')
        : h('button', { html: `${icon('screen')} ${t('Ekranımı yansıt')}`, onclick: startShare })) : null,
    );
    if (tv.kind === 'screen') b.append(h('p', { class: 'small' }, t('{name} ekranını yansıtıyor', { name: tv.by === ctx.uid ? ctx.myName() : tv.name || '' })));
    if (tv.src || tv.kind === 'screen') {
      b.append(tv.src ? h('p', { class: 'small admtv-now' }, document.createTextNode(webUrl(tv))) : null,
        h('div', { class: 'row wrap' },
          h('button', { html: `${icon('full')} ${t('Büyüt')}`, onclick: () => { closeSheet(); if (mode() !== 'tv') update(tvRef, { mode: 'tv' }); setFull(true); } }),
          tv.src ? h('button', { onclick: openOutside }, 'Yeni sekmede aç') : null,
          h('button', { class: 'link', onclick: () => { stopShare(false); set(tvRef, { mode: 'tv' }); } }, 'Kanalı kapat')));
    }
    b.append(h('p', { class: 'small' }, t('YouTube ve videoda durdurma ve sarma herkese yansır. Sitelerde herkes kendi gezer; birebir aynı görüntü için "Ekranımı yansıt"ı kullan. Bazı siteler başka bir sitenin içinde açılmaz; ekran boş kalırsa "Yeni sekmede aç"a bas.')));
    if (mode() === 'stats') statsSheet(b);
  }
  function open() {
    sheetBody = openSheet({ title: 'TV', iconName: 'tv', wide: true, onClose: () => (sheetBody = null) });
    renderSheet();
  }

  function onScene(scene) {
    inRoom = scene === 'admin';
    if (inRoom && !stop) stop = onValue(tvRef, (s) => { tv = s.val() || {}; refreshUi(); }, () => {});
    if (!inRoom) { stop?.(); stop = null; stopShare(true); }
    refreshUi();
  }
  function destroy() { stop?.(); stopShare(true); destroyPlayer(); box.remove(); btns.remove(); }
  return { onScene, open, place, mode, destroy };
}
