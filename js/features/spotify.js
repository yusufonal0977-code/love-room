// Salondaki pikap: Spotify ile birlikte dinleme.
// Her biriniz kendi Spotify hesabını bağlar (PKCE, gizli anahtar yok). Biriniz liste/şarkı seçince
// ikinizde aynı şarkı aynı saniyeden çalar; durdurma, ileri/geri de eşlenir.
//   Bilgisayar: tarayıcının içinde çalar (Spotify Web Playback SDK, Premium gerekir).
//   Telefon:    açık olan Spotify uygulamanı uzaktan kumanda eder (Spotify Connect).
//
// live/{rid}/music = { uri (liste), name, image, track, trackName, artist, playing, pos (ms), at, by }
// live/{rid}/musicLists/{uid} = partnerin görebileceği listeler
import { h, icon, openSheet, closeSheet, toast, esc } from '../ui.js';
import { serverTimestamp, set, now } from '../fb.js';
import { SPOTIFY_CLIENT_ID, APP_URL } from '../config.js';
import { DECOR } from '../scenes.js';

const SCOPES = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public';
const KEY = 'lr.sp';
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randStr = (n) => b64url(crypto.getRandomValues(new Uint8Array(n))).slice(0, n);

let tok = JSON.parse(localStorage.getItem(KEY) || 'null');
const saveTok = (t) => { tok = t; t ? localStorage.setItem(KEY, JSON.stringify(t)) : localStorage.removeItem(KEY); };

export async function spotifyLogin() {
  const verifier = randStr(64), st = randStr(16);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  localStorage.setItem('lr.sp.v', verifier);
  localStorage.setItem('lr.sp.s', st);
  sessionStorage.setItem('lr.sp.back', '1');
  location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: APP_URL, code_challenge_method: 'S256', code_challenge: challenge, scope: SCOPES, state: st,
  });
}

/** Spotify girişinden dönüşte (?code=…) jetonu alır. Açılışta, yönlendirmeden önce çağrılır. */
export async function handleSpotifyRedirect() {
  const p = new URLSearchParams(location.search);
  if (!p.has('code') && !p.has('error')) return null;
  if (p.get('state') !== localStorage.getItem('lr.sp.s')) return null;
  history.replaceState(null, '', location.pathname);
  if (p.get('error')) return { error: p.get('error') === 'access_denied' ? 'Spotify bağlantısı iptal edildi.' : 'Spotify girişi tamamlanamadı.' };
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, grant_type: 'authorization_code', code: p.get('code'), redirect_uri: APP_URL, code_verifier: localStorage.getItem('lr.sp.v') }),
    });
    const j = await r.json();
    if (!r.ok) return { error: `Spotify: ${j.error_description || j.error}` };
    saveTok({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + j.expires_in * 1000 });
    return { ok: true };
  } catch { return { error: 'Spotify\'a ulaşılamadı.' }; }
}

async function token() {
  if (!tok) return null;
  if (Date.now() < tok.exp - 60_000) return tok.access;
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, grant_type: 'refresh_token', refresh_token: tok.refresh }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { saveTok(null); return null; }
  saveTok({ access: j.access_token, refresh: j.refresh_token || tok.refresh, exp: Date.now() + j.expires_in * 1000 });
  return tok.access;
}

class SpotifyError extends Error { constructor(status, msg, reason) { super(msg); this.status = status; this.reason = reason; } }
async function api(path, { method = 'GET', body } = {}) {
  const t = await token();
  if (!t) throw new SpotifyError(401, 'Spotify bağlı değil');
  const r = await fetch('https://api.spotify.com/v1' + path, { method, headers: { Authorization: 'Bearer ' + t, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 204 || r.status === 202) return null;
  const txt = await r.text();
  const j = txt ? (() => { try { return JSON.parse(txt); } catch { return { raw: txt }; } })() : null;
  if (!r.ok) throw new SpotifyError(r.status, j?.error?.message || j?.raw || 'Spotify hatası', j?.error?.reason);
  return j;
}
/** Hatayı kullanıcıya anlaşılır cümleye çevirir. */
function explain(e) {
  const m = String(e?.message || '');
  if (e?.reason === 'PREMIUM_REQUIRED' || /premium/i.test(m)) return 'Bu hesapta Spotify Premium yok: birlikte çalma için Premium gerekiyor. Yine de partnerinin ne çaldığını görüp "Spotify\'da aç" ile kendin başlatabilirsin.';
  if (/not registered|developer dashboard/i.test(m)) return 'Bu Spotify hesabı uygulamaya eklenmemiş. developer.spotify.com → Love Room → Settings → User Management bölümüne bu hesabın adını ve e-postasını ekle.';
  if (e?.reason === 'NO_ACTIVE_DEVICE' || /no active device/i.test(m)) return 'Açık bir Spotify bulunamadı. Telefonda Spotify uygulamasını aç, bir şarkıyı başlatıp durdur, sonra tekrar dene.';
  return m;
}

export function createSpotify(ctx) {
  const { live, uid } = ctx;
  let state, me = null, sdkDevice = null, sdkPlayer = null, myLists = [], partnerLists = [], err = '';
  let sheetBody = null, applying = 0, meTried = false;

  const connected = () => !!tok;
  const expectedMs = (s) => (s.pos || 0) + (s.playing ? Math.max(0, now() - (s.at || now())) : 0);

  // ---------- Tarayıcı oynatıcısı (bilgisayar) ----------
  function loadSDK() {
    if (isMobile || sdkPlayer || !connected()) return;
    window.onSpotifyWebPlaybackSDKReady = () => {
      sdkPlayer = new window.Spotify.Player({ name: 'Get Love Room ☀️🌙', getOAuthToken: (cb) => token().then((t) => t && cb(t)), volume: 0.7 });
      sdkPlayer.addListener('ready', ({ device_id }) => { sdkDevice = device_id; if (state?.playing && state.by !== uid) playHere(state); render(); });
      sdkPlayer.addListener('not_ready', () => { sdkDevice = null; });
      sdkPlayer.addListener('account_error', () => { err = explain({ reason: 'PREMIUM_REQUIRED' }); sdkDevice = null; render(); });
      sdkPlayer.addListener('authentication_error', () => { err = 'Spotify oturumu geçersiz; yeniden bağlan.'; render(); });
      sdkPlayer.addListener('initialization_error', () => { sdkDevice = null; });
      sdkPlayer.connect();
    };
    document.head.append(h('script', { src: 'https://sdk.scdn.co/spotify-player.js' }));
  }

  async function device() {
    if (sdkDevice) return sdkDevice;
    const d = await api('/me/player/devices');
    const list = d?.devices || [];
    return (list.find((x) => x.is_active) || list.find((x) => x.type === 'Smartphone') || list[0])?.id || null;
  }

  async function playHere(s) {
    if (!connected()) return;
    try {
      sdkPlayer?.activateElement?.();
      const dev = await device();
      if (!dev) throw new SpotifyError(404, 'no active device', 'NO_ACTIVE_DEVICE');
      applying = Date.now() + 2500;
      const pos = Math.max(0, Math.round(expectedMs(s)));
      const body = s.uri ? { context_uri: s.uri, position_ms: pos, ...(s.track ? { offset: { uri: s.track } } : {}) } : { uris: [s.track], position_ms: pos };
      await api(`/me/player/play?device_id=${dev}`, { method: 'PUT', body });
      if (!s.playing) await api(`/me/player/pause?device_id=${dev}`, { method: 'PUT' }).catch(() => {});
      err = '';
    } catch (e) { err = explain(e); render(); }
  }
  async function pauseHere() {
    if (!connected()) return;
    try { applying = Date.now() + 2000; await api('/me/player/pause', { method: 'PUT' }); } catch { /* zaten durmuş */ }
  }
  async function nowPlaying() {
    try { return await api('/me/player'); } catch { return null; }
  }

  // ---------- Ortak durum ----------
  async function publishFromPlayer(extra = {}) {
    const p = await nowPlaying();
    const it = p?.item;
    if (!it) return;
    const s = {
      ...(state || {}), ...extra,
      track: it.uri, trackName: it.name, artist: it.artists?.map((a) => a.name).join(', ') || '', image: it.album?.images?.[1]?.url || it.album?.images?.[0]?.url || state?.image || '',
      playing: !!p.is_playing, pos: p.progress_ms || 0, by: uid,
      uri: p.context?.uri && /playlist|album/.test(p.context.uri) ? p.context.uri : extra.uri ?? state?.uri ?? null,
    };
    state = { ...s, at: now() };
    await set(live.ref('music'), { ...s, at: serverTimestamp() });
  }

  live.on('music', (v) => {
    const prev = state;
    state = v;
    DECOR.music = !!v?.playing;
    render();
    if (!v) { if (prev) pauseHere(); return; }
    if (v.by === uid) return;
    if (prev !== undefined && prev?.track !== v.track) toast(`🎵 ${v.trackName || v.name || 'Müzik'}${v.artist ? ' · ' + v.artist : ''}`);
    if (!connected()) return;
    if (v.playing) playHere(v); else pauseHere();
  });
  live.on(`musicLists`, (all) => { partnerLists = Object.entries(all || {}).filter(([k]) => k !== uid).flatMap(([, l]) => l || []); render(); });

  // Çalanın sahibi olan taraf, şarkı kendiliğinden değişince (liste ilerledi, uygulamadan atladı) durumu günceller.
  setInterval(async () => {
    if (!connected() || !state || state.by !== uid || Date.now() < applying) return;
    const p = await nowPlaying();
    if (!p?.item) return;
    if (p.item.uri !== state.track || !!p.is_playing !== !!state.playing) publishFromPlayer();
  }, 5000);

  async function loadMe() {
    if (!connected() || me || meTried) return;
    meTried = true;
    try {
      me = await api('/me');
      const pl = await api('/me/playlists?limit=50');
      myLists = (pl?.items || []).filter(Boolean).map((p) => ({ uri: p.uri, name: p.name, image: p.images?.[0]?.url || '', owner: p.owner?.display_name || '', shareable: p.public || p.collaborative, count: p.tracks?.total ?? 0 }));
      set(live.ref(`musicLists/${uid}`), myLists.filter((p) => p.shareable).slice(0, 30).map(({ uri, name, image, owner }) => ({ uri, name, image, owner })));
      loadSDK();
    } catch (e) { err = explain(e); }
    render();
  }

  // ---------- Kontroller ----------
  async function choose(list) {
    const s = { uri: list.uri, name: list.name, image: list.image, track: null, trackName: list.name, artist: '', playing: true, pos: 0, by: uid };
    state = { ...s, at: now() };
    await set(live.ref('music'), { ...s, at: serverTimestamp() });
    live.stat('songs');
    await playHere(state);
    setTimeout(() => publishFromPlayer({ uri: list.uri, name: list.name }), 1500);
  }
  async function chooseTrack(t) {
    const s = { uri: null, name: t.name, image: t.album?.images?.[1]?.url || '', track: t.uri, trackName: t.name, artist: t.artists.map((a) => a.name).join(', '), playing: true, pos: 0, by: uid };
    state = { ...s, at: now() };
    await set(live.ref('music'), { ...s, at: serverTimestamp() });
    live.stat('songs');
    await playHere(state);
  }
  async function toggle() {
    if (!state) return;
    const playing = !state.playing;
    const s = { ...state, playing, pos: Math.round(expectedMs(state)), by: uid };
    state = { ...s, at: now() };
    await set(live.ref('music'), { ...s, at: serverTimestamp() });
    if (playing) playHere(state); else pauseHere();
  }
  async function skip(dir) {
    if (!connected()) return toast('Önce Spotify\'ını bağla');
    try { await api(`/me/player/${dir > 0 ? 'next' : 'previous'}`, { method: 'POST' }); setTimeout(() => publishFromPlayer(), 900); } catch (e) { toast(explain(e), 5000); }
  }
  async function makeShared() {
    try {
      const p = await api(`/users/${me.id}/playlists`, { method: 'POST', body: { name: 'Get Love Room ☀️🌙', collaborative: true, public: false, description: 'İkimizin ortak listesi' } });
      await navigator.clipboard?.writeText(p.external_urls.spotify).catch(() => {});
      toast('Ortak liste oluşturuldu, linki kopyalandı. Partnerine gönder: takip edince ikiniz de şarkı ekleyebilirsiniz.', 6000);
      me = null; meTried = false; loadMe();
    } catch (e) { toast(explain(e), 5000); }
  }

  // ---------- Pencere ----------
  function render() {
    if (!sheetBody || !document.body.contains(sheetBody)) { sheetBody = null; return; }
    const b = sheetBody;
    b.innerHTML = '';
    if (state) {
      const link = state.track ? `https://open.spotify.com/track/${state.track.split(':').pop()}` : state.uri ? `https://open.spotify.com/${state.uri.split(':')[1]}/${state.uri.split(':').pop()}` : '';
      b.append(h('div', { class: 'np' },
        state.image ? h('img', { src: state.image, alt: '' }) : h('div', { class: 'npart', html: icon('music') }),
        h('div', { class: 'grow' }, h('b', {}, state.trackName || state.name || ''), h('small', {}, [state.artist, state.uri ? state.name : ''].filter(Boolean).join(' · ')),
          h('div', { class: 'row' },
            h('button', { title: 'Önceki', html: icon('prev'), onclick: () => skip(-1) }),
            h('button', { class: 'primary', title: 'Oynat/durdur', html: icon(state.playing ? 'pause' : 'play'), onclick: toggle }),
            h('button', { title: 'Sonraki', html: icon('next'), onclick: () => skip(1) }),
            link ? h('a', { class: 'btn', href: link, target: '_blank', rel: 'noopener' }, 'Spotify\'da aç') : null,
          )),
      ));
    }
    if (err) b.append(h('p', { class: 'note' }, err));
    if (!connected()) {
      b.append(
        h('p', {}, 'Spotify hesabını bağla: listelerinizden birini seçin, ikinizde aynı anda çalsın.'),
        h('button', { class: 'primary spotify', onclick: spotifyLogin }, 'Spotify ile bağlan'),
        h('p', { class: 'small' }, isMobile ? 'Telefonda müzik Spotify uygulamandan çalar; uygulama açık olsun.' : 'Bilgisayarda müzik doğrudan bu sayfada çalar (Spotify Premium gerekir).'),
      );
      return;
    }
    if (!me) {
      if (!meTried) { b.append(h('p', { class: 'small' }, 'Listelerin yükleniyor…')); loadMe(); }
      else b.append(h('button', { onclick: () => { meTried = false; err = ''; render(); } }, 'Tekrar dene'), h('button', { class: 'link', onclick: () => { saveTok(null); meTried = false; err = ''; render(); } }, 'Başka hesapla bağlan'));
      return;
    }
    const search = h('input', { class: 'wide', placeholder: 'Şarkı ara…', autocomplete: 'off' });
    const results = h('div', { class: 'list' });
    search.onkeydown = async (e) => {
      if (e.key !== 'Enter' || !search.value.trim()) return;
      try {
        const r = await api(`/search?type=track&limit=8&q=${encodeURIComponent(search.value.trim())}`);
        results.innerHTML = '';
        (r?.tracks?.items || []).forEach((t) => results.append(h('button', { class: 'item', onclick: () => chooseTrack(t) }, `${t.name} · ${t.artists.map((a) => a.name).join(', ')}`)));
      } catch (er) { toast(explain(er)); }
    };
    b.append(search, results);
    const listEl = (l) => h('button', { class: 'pl', onclick: () => choose(l) }, l.image ? h('img', { src: l.image, alt: '' }) : h('div', { class: 'npart', html: icon('music') }), h('span', {}, l.name));
    if (partnerLists.length) b.append(h('small', {}, `${ctx.partnerName()}'in listeleri`), h('div', { class: 'pls' }, ...partnerLists.map(listEl)));
    b.append(h('small', {}, 'Senin listelerin'), h('div', { class: 'pls' }, ...myLists.map(listEl)));
    b.append(h('div', { class: 'row' },
      h('button', { onclick: makeShared }, 'Ortak liste oluştur'),
      h('button', { class: 'link', onclick: () => { saveTok(null); me = null; meTried = false; sdkPlayer?.disconnect(); sdkPlayer = null; sdkDevice = null; render(); } }, 'Spotify bağlantısını kes'),
    ));
    b.append(h('p', { class: 'small' }, `${me.display_name || ''} olarak bağlı · ${sdkDevice ? 'bu sayfada çalıyor' : isMobile ? 'Spotify uygulamandan çalıyor' : 'oynatıcı hazırlanıyor…'}`));
  }

  function open() {
    sheetBody = openSheet({ title: 'Pikap · birlikte dinle', iconName: 'music', onClose: () => (sheetBody = null) });
    render();
  }

  if (connected()) loadMe();
  return { open, get playing() { return !!state?.playing; } };
}
