// Salondaki TV: link yapıştır → ikinizde aynı anda oynar (YouTube veya doğrudan video dosyası).
// Biri durdurur/ileri sarar → diğerinde de olur. Sinema modu tam ekran açar. Ekran yansıtma da burada görünür.
//
// live/{rid}/tv = { kind: 'yt'|'file', src, title, playing, pos (sn), at (sunucu zamanı), by }
import { h, icon, openSheet, closeSheet, toast, esc } from '../ui.js';
import { serverTimestamp, set, now } from '../fb.js';
import { DECOR, W, H } from '../scenes.js';

const TV_RECT = [73, 13, 46, 26]; // salondaki ekran (sahne pikseli)

export function parseLink(raw) {
  const s = raw.trim();
  if (!s) return null;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch { return null; }
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
  if (/\.(mp4|webm|ogv|ogg|mov|m4v)(\?|$)/i.test(u.pathname) || /\b(drive\.google|dropbox|archive\.org)/.test(host)) {
    let src = u.href;
    if (host.includes('dropbox.com')) { u.searchParams.set('raw', '1'); u.searchParams.delete('dl'); src = u.href; }
    return { kind: 'file', src, start: 0 };
  }
  return { kind: 'unsupported' };
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
  let state, cinema = false, screenStream = null, applyingUntil = 0;
  let yt = null, ytReady = false, ytId = null, ytReadyP = null;

  // ---------- DOM ----------
  const ytHost = h('div', { class: 'yt' }, h('div', { id: 'ytPlayer' }));
  const file = h('video', { class: 'file', playsInline: true, controls: true, preload: 'auto' });
  const screen = h('video', { class: 'screen', playsInline: true, autoplay: true, muted: true });
  const join = h('button', { class: 'tvjoin', hidden: true, html: `${icon('play')} İzlemeye katıl` });
  const title = h('span', { class: 'tvtitle' });
  const bar = h('div', { class: 'tvbar' },
    title,
    h('button', { title: 'Oynat / durdur', html: icon('pause'), onclick: () => togglePlay() }),
    h('button', { title: 'Partnerine eşitle', html: icon('link'), onclick: () => { applyState(true); toast('Eşitlendi'); } }),
    h('button', { title: 'Küçült', html: icon('close'), onclick: () => setCinema(false) }),
  );
  const box = h('div', { class: 'tvbox', hidden: true }, ytHost, file, screen, join, bar);
  document.getElementById('tvLayer').append(box);
  box.addEventListener('click', (e) => { if (!cinema && e.target === box) setCinema(true); });
  const tapZone = h('div', { class: 'tvtap', onclick: () => setCinema(true) });
  box.append(tapZone);

  join.onclick = () => { join.hidden = true; applyState(true); if (state?.kind === 'yt') yt?.playVideo(); else file.play().catch(() => {}); };

  function setCinema(on) {
    cinema = on;
    box.classList.toggle('cinema', on);
    if (on && !state && !screenStream) { cinema = false; box.classList.remove('cinema'); }
  }

  // ---------- Oynatıcılar ----------
  const current = () => (state?.kind === 'yt' ? (ytReady ? yt.getCurrentTime() : 0) : file.currentTime || 0);
  const isPlaying = () => (state?.kind === 'yt' ? ytReady && yt.getPlayerState() === 1 : !file.paused);
  const expected = (s) => (s.pos || 0) + (s.playing ? Math.max(0, (now() - (s.at || now())) / 1000) : 0);

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
          onStateChange: (e) => onLocal(e.data === 1 ? 'play' : e.data === 2 ? 'pause' : e.data === 0 ? 'end' : null),
        },
      });
    }));
  }

  function publish(patch) {
    if (!state) return;
    state = { ...state, ...patch, by: uid };
    set(live.ref('tv'), { ...state, at: serverTimestamp() });
    state.at = now();
  }
  function onLocal(kind) {
    if (!kind || !state || Date.now() < applyingUntil) return;
    if (kind === 'play' && !state.playing) publish({ playing: true, pos: current() });
    else if (kind === 'play' && Math.abs(current() - expected(state)) > 2) publish({ playing: true, pos: current() }); // ileri/geri sarma
    else if (kind === 'pause' && state.playing) publish({ playing: false, pos: current() });
    else if (kind === 'end') publish({ playing: false, pos: current() });
  }
  file.onplay = () => onLocal('play');
  file.onpause = () => !file.ended && onLocal('pause');
  file.onseeked = () => { if (Date.now() >= applyingUntil && state) publish({ pos: file.currentTime, playing: !file.paused }); };
  file.onended = () => onLocal('end');

  async function applyState(force = false) {
    const s = state;
    DECOR.tvOn = !!(s || screenStream);
    box.hidden = !(s || screenStream);
    box.classList.toggle('has-screen', !!screenStream);
    title.textContent = screenStream ? 'Ekran yansıtma' : s?.title || '';
    bar.querySelector('button').innerHTML = icon(s?.playing ? 'pause' : 'play');
    if (!s) {
      yt?.stopVideo?.(); file.pause(); file.removeAttribute('src');
      if (!screenStream) setCinema(false);
      return;
    }
    box.classList.toggle('is-yt', s.kind === 'yt');
    applyingUntil = Date.now() + 1200;
    const target = expected(s);
    if (s.kind === 'yt') {
      file.pause();
      await ensureYT(s.src, target);
      if (!ytReady || state !== s) return;
      if (force || Math.abs(yt.getCurrentTime() - target) > 1.5) yt.seekTo(target, true);
      if (s.playing) yt.playVideo(); else yt.pauseVideo();
    } else {
      yt?.pauseVideo?.();
      if (file.getAttribute('src') !== s.src) file.src = s.src;
      if (force || Math.abs(file.currentTime - target) > 1.5) { try { file.currentTime = target; } catch { /* henüz yüklenmedi */ } }
      if (s.playing) file.play().catch(() => (join.hidden = false)); else file.pause();
    }
    // Tarayıcı sesli otomatik oynatmayı engellediyse "İzlemeye katıl" düğmesi
    setTimeout(() => { if (state === s && s.playing && !isPlaying()) join.hidden = false; else join.hidden = true; }, 1800);
  }

  live.on('tv', (v) => {
    const prev = state;
    state = v;
    if (v && prev !== undefined && prev?.src !== v.src && v.by !== uid) toast(`${ctx.partnerName()} TV'de bir şey açtı 📺`);
    applyState();
  });
  // Kayma düzeltmesi
  setInterval(() => {
    if (!state?.playing || Date.now() < applyingUntil) return;
    if (Math.abs(current() - expected(state)) > 2.5) applyState();
  }, 4000);

  function togglePlay() {
    if (!state) return;
    const playing = !state.playing;
    publish({ playing, pos: current() });
    applyState(true);
  }

  // ---------- Konum: salondaki TV'nin üstüne oturur; sinema modunda tam ekran ----------
  function place() {
    if (box.hidden) return;
    const inSalon = game.me.scene === 'salon';
    const vol = inSalon || cinema ? 100 : 25;
    if (ytReady && yt.getVolume?.() !== vol) yt.setVolume(vol);
    file.volume = vol / 100;
    ctx.screenAudio.volume = vol / 100;
    box.classList.toggle('away', !inSalon && !cinema);
    if (cinema || !inSalon) { if (cinema) box.style.cssText = ''; return; }
    const r = game.canvas.getBoundingClientRect();
    const [x, y, w, hh] = TV_RECT;
    Object.assign(box.style, { left: r.left + (x / W) * r.width + 'px', top: r.top + (y / H) * r.height + 'px', width: (w / W) * r.width + 'px', height: (hh / H) * r.height + 'px' });
  }

  // ---------- Pencere ----------
  async function start(raw) {
    const p = parseLink(raw);
    if (!p) return toast('Link anlaşılamadı.');
    if (p.kind === 'unsupported') return toast('Bu site linkle oynatılamıyor. YouTube ya da .mp4 linki dene; Netflix gibi siteler için bilgisayardan ekranı yansıt.', 5000);
    let t = p.kind === 'yt' ? 'YouTube videosu' : decodeURIComponent(p.src.split('/').pop().split('?')[0]).slice(0, 40);
    if (p.kind === 'yt') {
      try { const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://youtu.be/' + p.src)}`); if (r.ok) t = (await r.json()).title || t; } catch { /* başlık olmasa da olur */ }
    }
    state = { kind: p.kind, src: p.src, title: t, playing: true, pos: p.start, by: uid };
    await set(live.ref('tv'), { ...state, at: serverTimestamp() });
    live.stat('movies');
    const rec = JSON.parse(localStorage.getItem('lr.tvRecent') || '[]').filter((x) => x.url !== raw.trim());
    localStorage.setItem('lr.tvRecent', JSON.stringify([{ url: raw.trim(), title: t }, ...rec].slice(0, 6)));
    closeSheet();
    setCinema(true);
    join.hidden = true;
    if (p.kind === 'yt') { await ensureYT(p.src, p.start); yt.playVideo(); } else applyState(true);
  }

  function open() {
    const body = openSheet({ title: 'TV · birlikte izle', iconName: 'tv' });
    const input = h('input', { class: 'wide', placeholder: 'YouTube ya da video linki yapıştır', autocomplete: 'off' });
    input.onkeydown = (e) => e.key === 'Enter' && start(input.value);
    body.append(
      state ? h('div', { class: 'nowplaying' },
        h('div', {}, h('small', {}, 'Şu an'), h('b', {}, state.title || '')),
        h('div', { class: 'row' },
          h('button', { class: 'primary', onclick: () => { closeSheet(); setCinema(true); } }, 'Sinemaya geç'),
          h('button', { onclick: () => { togglePlay(); closeSheet(); } }, state.playing ? 'Durdur' : 'Oynat'),
          h('button', { onclick: () => { set(live.ref('tv'), null); closeSheet(); } }, 'TV\'yi kapat'),
        )) : null,
      h('div', { class: 'row grow' }, input, h('button', { class: 'primary', onclick: () => start(input.value) }, 'İzle')),
      h('p', { class: 'small' }, 'Linki açan kim olursa olsun ikinizde aynı saniyede oynar. Biriniz durdurunca, ileri sarınca diğerinde de olur.'),
    );
    const rec = JSON.parse(localStorage.getItem('lr.tvRecent') || '[]');
    if (rec.length) body.append(h('div', { class: 'list' }, h('small', {}, 'Son izlenenler'), ...rec.map((r) => h('button', { class: 'item', onclick: () => start(r.url) }, r.title))));
    if (ctx.call.canShareScreen) {
      body.append(h('button', { html: `${icon('screen')} ${ctx.call.screenStream ? 'Ekran yansıtmayı bitir' : 'Ekranımı yansıt (sesli, film kalitesinde)'}`, onclick: () => { closeSheet(); ctx.toggleScreen(); } }));
      body.append(h('p', { class: 'small' }, 'Netflix, Disney+, Prime gibi uygulamalar için: ekran yansıtmada "Sekme" seç ve "Sekme sesini paylaş" kutusunu işaretle.'));
    } else {
      body.append(h('p', { class: 'small note' }, 'Telefon tarayıcıları ekran yansıtmaya izin vermiyor (Apple ve Google kısıtlaması). Telefondayken linkle birlikte izleyin; partnerin bilgisayardaysa o yansıtabilir.'));
    }
  }

  return {
    open,
    place,
    get active() { return !!state; },
    setScreen(stream) {
      screenStream = stream && stream.getVideoTracks().length ? stream : null;
      screen.srcObject = screenStream;
      if (screenStream) screen.play().catch(() => {});
      applyState();
    },
    cinema: setCinema,
  };
}
