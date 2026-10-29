// Salondaki TV: birlikte izleme.
//   • Link: YouTube ya da video dosyası → ikinizde aynı saniyede oynar; durdurma/sarma eşlenir.
//     Kayma 1 saniyeyi geçerse kendiliğinden düzeltilir; birinin videosu takılırsa diğeri bekler.
//   • Web sitesi: herhangi bir sayfayı TV'de açar (site izin veriyorsa). Oynatmayı otomatik eşleyemeyiz;
//     "3-2-1 birlikte başlat" geri sayımı var.
//   • Paylaşım: bilgisayarda ekran yansıtma; telefonda galeriden video ya da arka kamera (canlı akış, doğal olarak senkron).
// Sinema modu: kamera odadaki TV'ye yakınlaşır (oda görünmeye devam eder). "Sadece film" tüm ekranı kaplar.
//
// live/{rid}/tv    = { kind: 'yt'|'file'|'web', src, title, playing, pos (sn), at (sunucu zamanı), by, wait?, count? }
// live/{rid}/tvPos = { uid: { pos, at } }   iki tarafın gerçek konumu (fark göstergesi)
import { h, icon, openSheet, closeSheet, toast } from '../ui.js';
import { serverTimestamp, set, now } from '../fb.js';
import { t } from '../i18n.js';
import { DECOR, W, H } from '../scenes.js';
import { t } from '../i18n.js';

const TV_RECT = [73, 13, 46, 26]; // salondaki ekran (sahne pikseli)
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function parseLink(raw) {
  const s = raw.trim();
  if (!s) return null;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/) || [])[1];
  }
  if (id) {
    const t = u.searchParams.get('t') || u.searchParams.get('start');
    const start = t ? (+t || (+(t.match(/(\d+)h/) || [0, 0])[1] * 3600 + +(t.match(/(\d+)m/) || [0, 0])[1] * 60 + +(t.match(/(\d+)s/) || [0, 0])[1])) : 0;
    return { kind: 'yt', src: id, start };
  }
  if (/\.(mp4|webm|ogv|ogg|mov|m4v)(\?|$)/i.test(u.pathname) || host.includes('dropbox.com')) {
    if (host.includes('dropbox.com')) { u.searchParams.set('raw', '1'); u.searchParams.delete('dl'); }
    return { kind: 'file', src: u.href, start: 0 };
  }
  return { kind: 'web', src: u.href, start: 0, host };
}

let ytApi = null;
function loadYT() {
  ytApi ??= new Promise((res) => {
    if (window.YT?.Player) return res(window.YT);
    window.onYouTubeIframeAPIReady = () => res(window.YT);
    document.head.append(h('script', { src: 'https://www.youtube.com/iframe_api' }));
  });
  return ytApi;
}

export function createTV(ctx) {
  const { live, uid, game } = ctx;
  let state, cinema = false, full = false, screenStream = null, applyingUntil = 0;
  let yt = null, ytReady = false, ytId = null, ytReadyP = null;
  let bufSince = 0, readySince = 0, positions = {}, localShare = null;

  // ---------- DOM ----------
  const ytHost = h('div', { class: 'yt' }, h('div', { id: 'ytPlayer' }));
  const file = h('video', { class: 'file', playsInline: true, controls: true, preload: 'auto' });
  const web = h('iframe', { class: 'web', allow: 'autoplay; fullscreen; encrypted-media; picture-in-picture', referrerPolicy: 'no-referrer', allowFullscreen: true });
  const screen = h('video', { class: 'screen', playsInline: true, autoplay: true, muted: true });
  const join = h('button', { class: 'tvjoin', hidden: true, html: `${icon('play')} İzlemeye katıl` });
  const count = h('div', { class: 'tvcount', hidden: true });
  const tapZone = h('div', { class: 'tvtap', onclick: () => setCinema(true) });
  const box = h('div', { class: 'tvbox', hidden: true }, ytHost, file, web, screen, join, count, tapZone);
  document.getElementById('tvLayer').append(box);

  // Sinema kontrolleri (alt çubuğun yerine geçer; telefonda üst üste binmez)
  const cTitle = h('span', { class: 'ctitle' });
  const cSync = h('span', { class: 'csync' });
  const cPlay = h('button', { title: 'Oynat / durdur', onclick: () => togglePlay() });
  const cbar = h('div', { class: 'cinebar', hidden: true },
    h('div', { class: 'cinfo' }, cTitle, cSync),
    h('div', { class: 'cbtns' },
      cPlay,
      h('button', { title: 'Eşitle', html: icon('link'), onclick: () => { applyState(true); toast('Eşitlendi'); } }),
      h('button', { title: 'Kalp', class: 'love', html: icon('heart'), onclick: () => ctx.react('heart') }),
      h('button', { title: 'Mikrofon', html: icon('mic'), onclick: (e) => { ctx.toggleMic(); e.currentTarget.innerHTML = icon(ctx.call.micOn ? 'mic' : 'micOff'); } }),
      h('button', { title: 'Sadece film (tam ekran)', html: icon('full'), onclick: () => setFull(!full) }),
      h('button', { title: 'Sinemadan çık', html: icon('close'), onclick: () => setCinema(false) }),
    ));
  document.body.append(cbar);

  join.onclick = () => { join.hidden = true; applyState(true); if (state?.kind === 'yt') yt?.playVideo(); else if (state?.kind === 'file') file.play().catch(() => {}); };

  function setCinema(on) {
    if (on && !state && !screenStream) on = false;
    cinema = on;
    if (!on) setFull(false);
    game.setCinema(on);
    document.body.classList.toggle('cinema', on);
    cbar.hidden = !on;
    if (on && game.me.scene !== 'salon') { game.goto('salon', 96, 92); setTimeout(() => game.sit('sofa'), 300); }
    else if (on && game.me.seat < 0) { game.goto('salon', 96, 92); setTimeout(() => game.sit('sofa'), 100); }
    updateBar();
  }
  function setFull(on) {
    full = on;
    box.classList.toggle('full', on);
    if (on) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  function updateBar() {
    cTitle.textContent = screenStream ? (localShare ? t('Sen paylaşıyorsun · {name}', { name: t(localShare.name) }) : t('Paylaşım')) : state?.title || '';
    const playing = localShare?.v ? !localShare.v.paused : state?.playing;
    cPlay.innerHTML = icon(playing ? 'pause' : 'play');
    cPlay.hidden = !!screenStream && !localShare?.v;
  }

  // ---------- Oynatıcılar ----------
  const current = () => (state?.kind === 'yt' ? (ytReady ? yt.getCurrentTime() : 0) : file.currentTime || 0);
  const isPlaying = () => (state?.kind === 'yt' ? ytReady && yt.getPlayerState() === 1 : !file.paused);
  const expected = (s) => (s.pos || 0) + (s.playing ? Math.max(0, (now() - (s.at || now())) / 1000) : 0);
  const syncable = () => state && (state.kind === 'yt' || state.kind === 'file');

  async function ensureYT(id, start) {
    const YT = await loadYT();
    // Oynatıcı tek sefer kurulur; aynı anda gelen çağrılar hazır olmasını bekler
    if (ytReadyP) {
      await ytReadyP;
      if (ytId !== id) { ytId = id; yt.loadVideoById({ videoId: id, startSeconds: start }); }
      return;
    }
    ytId = id;
    await (ytReadyP = new Promise((res) => {
      yt = new YT.Player('ytPlayer', {
        videoId: id,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, start: Math.floor(start), autoplay: 1 },
        events: {
          onReady: () => { ytReady = true; res(); },
          onError: (e) => toast([101, 150].includes(e.data) ? 'Bu videonun sahibi başka sitelerde oynatılmasına izin vermiyor. Başka bir video dene.' : 'Video açılamadı.', 5000),
          onStateChange: (e) => {
            bufState(e.data === 3);
            onLocal(e.data === 1 ? 'play' : e.data === 2 ? 'pause' : e.data === 0 ? 'end' : null);
          },
        },
      });
    }));
  }
  function bufState(b) { if (b) { bufSince ||= Date.now(); readySince = 0; } else { bufSince = 0; readySince ||= Date.now(); } }

  function publish(patch) {
    if (!state) return;
    state = { ...state, ...patch, by: uid };
    set(live.ref('tv'), { ...state, at: serverTimestamp() });
    state.at = now();
    updateBar();
  }
  function onLocal(kind) {
    if (!kind || !syncable() || Date.now() < applyingUntil) return;
    if (kind === 'play' && !state.playing) publish({ playing: true, pos: current(), wait: null });
    else if (kind === 'play' && Math.abs(current() - expected(state)) > 2) publish({ playing: true, pos: current() }); // ileri/geri sarma
    else if (kind === 'pause' && state.playing) publish({ playing: false, pos: current() });
    else if (kind === 'end') publish({ playing: false, pos: current() });
  }
  file.onplay = () => onLocal('play');
  file.onpause = () => !file.ended && onLocal('pause');
  file.onseeked = () => { if (Date.now() >= applyingUntil && state) publish({ pos: file.currentTime, playing: !file.paused }); };
  file.onended = () => onLocal('end');
  file.onwaiting = () => bufState(true);
  file.onplaying = file.oncanplay = () => bufState(false);

  async function applyState(force = false) {
    const s = state;
    DECOR.tvOn = !!(s || screenStream);
    box.hidden = !(s || screenStream);
    box.classList.toggle('has-screen', !!screenStream);
    box.dataset.kind = s?.kind || '';
    updateBar();
    if (!s) {
      yt?.stopVideo?.(); file.pause(); file.removeAttribute('src'); web.removeAttribute('src');
      if (!screenStream) setCinema(false);
      return;
    }
    if (s.kind === 'web') {
      yt?.pauseVideo?.(); file.pause();
      if (web.getAttribute('src') !== s.src) web.src = s.src;
      return;
    }
    web.removeAttribute('src');
    applyingUntil = Date.now() + 1200;
    const target = expected(s);
    if (s.kind === 'yt') {
      file.pause();
      await ensureYT(s.src, target);
      if (!ytReady || state !== s) return;
      if (force || Math.abs(yt.getCurrentTime() - target) > 1) yt.seekTo(target, true);
      if (s.playing) yt.playVideo(); else yt.pauseVideo();
    } else {
      yt?.pauseVideo?.();
      if (file.getAttribute('src') !== s.src) file.src = s.src;
      if (force || Math.abs(file.currentTime - target) > 1) { try { file.currentTime = target; } catch { /* henüz yüklenmedi */ } }
      if (s.playing) file.play().catch(() => (join.hidden = false)); else file.pause();
    }
    // Tarayıcı sesli otomatik oynatmayı engellediyse "İzlemeye katıl" düğmesi
    setTimeout(() => { join.hidden = !(state === s && s.playing && !isPlaying() && !bufSince); }, 1800);
  }

  live.on('tv', (v) => {
    const prev = state;
    state = v;
    if (v && prev !== undefined && prev?.src !== v.src && v.by !== uid) toast(t('{name} TV\'de bir şey açtı 📺', { name: ctx.partnerName() }));
    if (v?.wait && v.wait !== uid && prev?.wait !== v.wait) toast(t('{name} tarafında video yükleniyor, birlikte bekliyorsunuz…', { name: ctx.partnerName() }), 3500);
    if (v?.count && v.count !== prev?.count) countdown(v.count);
    applyState();
  });
  live.on('tvPos', (v) => (positions = v || {}));

  // ---------- Senkron bekçisi ----------
  // Her saniye: (1) takılan taraf herkesi bekletir, hazır olunca devam ettirir; (2) kayma 1 sn'yi geçerse düzeltir;
  // (3) kendi konumunu yazar ki iki taraf arasındaki fark görünsün.
  let tick = 0;
  setInterval(() => {
    if (!syncable()) { cSync.textContent = ''; return; }
    tick++;
    const nowMs = Date.now();
    if (state.playing && bufSince && nowMs - bufSince > 2500 && !state.wait) {
      publish({ playing: false, pos: current(), wait: uid });
      toast('Bağlantın yavaş: video yüklenene kadar ikiniz de bekliyorsunuz', 3000);
    } else if (state.wait === uid && !state.playing && !bufSince && readySince && nowMs - readySince > 1500) {
      publish({ playing: true, pos: current(), wait: null });
      applyState(true);
    } else if (state.playing && !bufSince && nowMs > applyingUntil && Math.abs(current() - expected(state)) > 1) {
      applyState();
    }
    if (tick % 3 === 0) set(live.ref(`tvPos/${uid}`), { pos: +current().toFixed(2), at: now() });
    const pu = ctx.partnerUid(), pp = pu && positions[pu];
    if (state.wait) cSync.textContent = t('⏳ Bekleniyor…');
    else if (pp && state.playing && now() - pp.at < 10_000) {
      const theirs = pp.pos + (now() - pp.at) / 1000, diff = Math.abs(theirs - current());
      cSync.textContent = diff < 1 ? t('● Senkron') : t('↻ {n} sn fark, düzeltiliyor', { n: diff.toFixed(1) });
      cSync.className = 'csync ' + (diff < 1 ? 'ok' : 'warn');
    } else { cSync.textContent = state.playing ? '' : t('Durduruldu'); cSync.className = 'csync'; }
  }, 1000);

  function togglePlay() {
    if (localShare?.v) { localShare.v.paused ? localShare.v.play() : localShare.v.pause(); updateBar(); return; }
    if (!syncable()) return;
    publish({ playing: !state.playing, pos: current(), wait: null });
    applyState(true);
  }

  // Web sitesi modu için birlikte başlatma geri sayımı
  function countdown(at) {
    count.hidden = false;
    const step = () => {
      const left = Math.ceil((at - now()) / 1000);
      count.textContent = left > 0 ? left : t('Şimdi ▶ oynat!');
      if (left > -2) setTimeout(step, 200); else count.hidden = true;
    };
    step();
  }

  // ---------- Konum: salondaki TV'nin üstüne oturur ----------
  function place() {
    if (box.hidden) return;
    const inSalon = game.me.scene === 'salon';
    const vol = inSalon || cinema ? 100 : 25;
    if (ytReady && yt.getVolume?.() !== vol) yt.setVolume(vol);
    file.volume = vol / 100;
    ctx.screenAudio.volume = vol / 100;
    box.classList.toggle('away', !inSalon && !full);
    box.classList.toggle('incinema', cinema);
    if (full || !inSalon) return;
    const r = game.canvas.getBoundingClientRect();
    const [x, y, w, hh] = TV_RECT;
    Object.assign(box.style, { left: r.left + (x / W) * r.width + 'px', top: r.top + (y / H) * r.height + 'px', width: (w / W) * r.width + 'px', height: (hh / H) * r.height + 'px' });
  }

  // ---------- Telefondan / cihazdan paylaşım ----------
  async function shareFile() {
    const f = await new Promise((res) => { const i = h('input', { type: 'file', accept: 'video/*' }); i.onchange = () => res(i.files[0] || null); i.click(); });
    if (!f) return;
    stopLocal();
    const v = h('video', { class: 'sharesrc', playsInline: true, src: URL.createObjectURL(f) });
    document.body.append(v);
    try { await v.play(); } catch { toast('Video oynatılamadı.'); v.remove(); return; }
    let stream = v.captureStream?.() || v.mozCaptureStream?.();
    if (!stream?.getVideoTracks().length) {
      // iPhone: görüntü tuvalden, ses Web Audio'dan alınır
      const c = h('canvas', { width: 1280, height: 720 });
      const g = c.getContext('2d');
      const draw = () => { if (!localShare || localShare.v !== v) return; if (v.videoWidth) { c.width = v.videoWidth > 1280 ? 1280 : v.videoWidth; c.height = Math.round(c.width * v.videoHeight / v.videoWidth); g.drawImage(v, 0, 0, c.width, c.height); } setTimeout(draw, 33); };
      stream = c.captureStream(30);
      try {
        const ac = new AudioContext(), src = ac.createMediaElementSource(v), dest = ac.createMediaStreamDestination();
        src.connect(dest); src.connect(ac.destination);
        stream.addTrack(dest.stream.getAudioTracks()[0]);
      } catch { /* ses olmadan devam */ }
      localShare = { v, name: f.name.slice(0, 40) };
      draw();
    } else localShare = { v, name: f.name.slice(0, 40) };
    v.onended = () => toast('Video bitti');
    v.onplay = v.onpause = updateBar;
    await ctx.shareMedia(stream);
    setCinema(true);
  }
  async function shareCamera() {
    stopLocal();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      localShare = { name: 'Kamera' };
      await ctx.shareMedia(s);
      setCinema(true);
    } catch { toast('Kamera açılamadı.'); }
  }
  function stopLocal() {
    if (!localShare) return;
    localShare.v?.pause(); localShare.v?.remove();
    localShare = null;
  }

  // ---------- Pencere ----------
  async function start(raw) {
    const p = parseLink(raw);
    if (!p) return toast('Link anlaşılamadı.');
    let title = p.kind === 'yt' ? t('YouTube videosu') : p.kind === 'web' ? p.host : decodeURIComponent(p.src.split('/').pop().split('?')[0]).slice(0, 40);
    if (p.kind === 'yt') {
      try { const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://youtu.be/' + p.src)}`); if (r.ok) title = (await r.json()).title || title; } catch { /* başlık olmasa da olur */ }
    }
    state = { kind: p.kind, src: p.src, title, playing: p.kind !== 'web', pos: p.start, by: uid };
    await set(live.ref('tv'), { ...state, at: serverTimestamp() });
    live.stat('movies');
    const rec = JSON.parse(localStorage.getItem('lr.tvRecent') || '[]').filter((x) => x.url !== raw.trim());
    localStorage.setItem('lr.tvRecent', JSON.stringify([{ url: raw.trim(), title }, ...rec].slice(0, 6)));
    closeSheet();
    setCinema(true);
    join.hidden = true;
    if (p.kind === 'yt') { await ensureYT(p.src, p.start); yt.playVideo(); } else applyState(true);
    if (p.kind === 'web') toast('Site TV\'de açıldı. Boş kalırsa site gömülmeye izin vermiyordur; o zaman bilgisayardan ekran paylaşın.', 6000);
  }

  function open() {
    const body = openSheet({ title: 'TV · birlikte izle', iconName: 'tv' });
    const input = h('input', { placeholder: 'YouTube, video ya da site linki yapıştır', autocomplete: 'off', inputMode: 'url' });
    input.onkeydown = (e) => e.key === 'Enter' && start(input.value);
    const sharing = !!ctx.call.screenStream;
    body.append(
      state ? h('div', { class: 'nowplaying' },
        h('div', {}, h('small', {}, 'Şu an'), h('b', {}, state.title || '')),
        h('div', { class: 'row wrap' },
          h('button', { class: 'primary', onclick: () => { closeSheet(); setCinema(true); } }, 'Sinema modu'),
          state.kind === 'web'
            ? h('button', { onclick: () => { set(live.ref('tv/count'), now() + 3500); closeSheet(); setCinema(true); } }, '3-2-1 birlikte başlat')
            : h('button', { onclick: () => { togglePlay(); closeSheet(); } }, state.playing ? 'Durdur' : 'Oynat'),
          h('button', { onclick: () => { set(live.ref('tv'), null); closeSheet(); } }, 'TV\'yi kapat'),
        )) : null,
      h('div', { class: 'row grow' }, input, h('button', { class: 'primary', onclick: () => start(input.value) }, 'Aç')),
      h('p', { class: 'small' }, 'YouTube ve video linkleri ikinizde aynı saniyede oynar; biri durdurunca, sarınca diğerinde de olur, kayarsa kendiliğinden düzelir. Diğer siteler TV\'de açılır (site izin veriyorsa); oynatmayı "3-2-1 birlikte başlat" ile aynı anda başlatın.'),
    );
    const rec = JSON.parse(localStorage.getItem('lr.tvRecent') || '[]');
    if (rec.length) body.append(h('div', { class: 'list' }, h('small', {}, 'Son açılanlar'), ...rec.map((r) => h('button', { class: 'item', onclick: () => start(r.url) }, r.title))));
    body.append(h('small', {}, isMobile ? 'Telefondan paylaş' : 'Paylaş'));
    if (sharing) body.append(h('button', { class: 'primary', onclick: () => { closeSheet(); stopLocal(); ctx.shareMedia(null); } }, 'Paylaşımı bitir'));
    else {
      body.append(h('div', { class: 'row wrap' },
        ctx.call.canShareScreen ? h('button', { html: `${icon('screen')} Ekranımı paylaş`, onclick: () => { closeSheet(); ctx.toggleScreen(); } }) : null,
        h('button', { html: `${icon('upload')} Galeriden video`, onclick: () => { closeSheet(); shareFile(); } }),
        h('button', { html: `${icon('cam')} Kamerayı TV'ye ver`, onclick: () => { closeSheet(); shareCamera(); } }),
      ));
      body.append(h('p', { class: 'small' }, ctx.call.canShareScreen
        ? 'Netflix, Disney+ gibi siteler için: "Ekranımı paylaş"ta sekmeyi seçip "Sekme sesini paylaş"ı işaretle.'
        : 'Telefon tarayıcıları tüm ekranı paylaştırmıyor; onun yerine telefondaki bir videoyu ya da kamerayı TV\'ye canlı gönderebilirsin.'));
    }
  }

  return {
    open,
    place,
    get active() { return !!state; },
    setScreen(stream) {
      screenStream = stream && stream.getVideoTracks().length ? stream : null;
      if (!screenStream) stopLocal();
      screen.srcObject = screenStream;
      if (screenStream) screen.play().catch(() => {});
      applyState();
    },
    cinema: setCinema,
  };
}
