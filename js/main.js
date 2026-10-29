// Get Love Room — giriş akışı ve dünya: açılış → giriş → (davet | ev kurma) → oda.
import { firstUser, loginGoogle, loginGuest, logout, now } from './fb.js';
import { acceptInvite, createRoom, getProfile, getRoom, joinLive, readInvite, saveProfile } from './net.js';
import { createGame } from './game.js';
import { createCall } from './call.js';
import { DEFAULT_STATE, SCENES, W, H } from './scenes.js';
import { APP_URL } from './config.js';
import { DEFAULT_LOOK, HAIR, HAIR_STYLES, OUTFIT_IDS, PANTS, SHIRT, SKIN, characterSprites, SUN_BADGE, MOON_BADGE } from './art.js';
import { $, h, icon, toast, openSheet, closeSheet, esc } from './ui.js';
import { createTV } from './features/tv.js';
import { createSpotify, handleSpotifyRedirect } from './features/spotify.js';
import { createPhotos } from './features/photos.js';
import { createLife } from './features/life.js';
import { createDraw } from './features/draw.js';
import { createCare } from './features/care.js';
import { createGames } from './features/games.js';
import { createDecorUI } from './features/decor-ui.js';
import { createPip } from './features/pip.js';
import { createChat } from './features/chat.js';
import { createShare } from './features/share.js';
import { createShowcase } from './features/showcase.js';
import { LEGAL, LEGAL_VERSION, legalById } from './legal.js';
import { auth, db, get, ref, remove } from './fb.js';
import { initI18n, t, lang, locale, langPicker } from './i18n.js';
import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

// ---------- Hakkımızda ve hukuki metinler (uygulama içi pencere) ----------
function openLegal(id) {
  const doc = legalById(id) || LEGAL[0];
  const body = openSheet({ title: t(doc.title), iconName: 'book', wide: true });
  body.append(
    h('div', { class: 'tabs' }, ...LEGAL.map((d) => h('button', { class: d.id === doc.id ? 'sel' : '', onclick: () => openLegal(d.id) }, t(d.title)))),
    h('div', { class: 'legal', html: doc.html }),
    h('a', { class: 'small', href: `legal.html#${doc.id}`, target: '_blank', rel: 'noopener' }, t('Ayrı sayfada aç')),
  );
}
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="#"]');
  if (!a || !legalById(a.getAttribute('href').slice(1))) return;
  e.preventDefault();
  openLegal(a.getAttribute('href').slice(1));
});

const show = (id) => { ['gate', 'consent', 'setup', 'invite', 'world'].forEach((s) => ($(s).hidden = s !== id)); $('langCorner').hidden = id === 'world'; };
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const SCENE_AT = { salon: 'salonda', somine: 'şömine başında', balkon: 'balkonda', hobi: 'hobi köşesinde' };
const sideIcon = (s) => (s === 'moon' ? '🌙' : '☀️');

// Davet kodu adresten okunur (?davet=...); giriş sonrası kullanılmak üzere saklanır.
const params = new URLSearchParams(location.search);
let inviteCode = params.get('davet') || sessionStorage.getItem('lr.davet');
if (params.get('davet')) {
  sessionStorage.setItem('lr.davet', inviteCode);
  history.replaceState(null, '', location.pathname);
}

let user = null, profile = null, spotifyReturn = null;

async function boot() {
  await initI18n();
  $('langCorner').append(langPicker());
  $('langMenu').append(langPicker());
  // Vitrin linki (?ev=…): giriş gerekmeden evi misafir olarak gez
  if (params.get('ev')) {
    const { runViewer } = await import('./viewer.js');
    if (await runViewer(params.get('ev'))) { setTimeout(() => $('intro')?.remove(), 1200); return; }
    toast(t('Bu vitrin linki artık yok.'), 4000);
  }
  const intro = new Promise((r) => setTimeout(r, 2600));
  spotifyReturn = await handleSpotifyRedirect();
  const [u] = await Promise.all([firstUser(), spotifyReturn ? Promise.resolve() : intro]);
  $('intro').remove();
  if (u) await afterLogin(u);
  else showGate();
}

// ---------- Giriş ----------
function showGate() {
  show('gate');
  if (inviteCode) $('gateNote').textContent = t('Partnerin seni bekliyor 💌 Giriş yap ve odaya gel.');
}
$('googleBtn').onclick = async () => {
  try { const r = await loginGoogle(); await afterLogin(r.user); }
  catch (e) { $('gateErr').textContent = t('Google girişi tamamlanamadı. Tekrar dene.'); console.warn(e); }
};
$('guestBtn').onclick = guest;
$('nameIn').addEventListener('keydown', (e) => e.key === 'Enter' && guest());
async function guest() {
  const name = $('nameIn').value.trim();
  if (!name) { $('nameIn').focus(); return; }
  try { const r = await loginGuest(); await afterLogin(r.user, name); }
  catch (e) { $('gateErr').textContent = t('Giriş yapılamadı. İnternet bağlantını kontrol et.'); console.warn(e); }
}

async function afterLogin(u, guestName) {
  user = u;
  profile = await getProfile(u.uid).catch((e) => { console.warn(e); return null; });
  if (!profile) {
    const name = guestName || u.displayName?.split(' ')[0] || t('Sevgili');
    profile = { name, look: { ...DEFAULT_LOOK, shirt: Math.floor(Math.random() * SHIRT.length) }, side: 'sun', tz, lang };
    await saveProfile(u.uid, profile);
  } else if (profile.tz !== tz || profile.lang !== lang) saveProfile(u.uid, { tz, lang });
  if ((profile.consent?.v || 0) < LEGAL_VERSION) await askConsent();
  await route();
}

/** Ev kurulmadan / davete girilmeden önce koşulların onayı (sürüm değişince yeniden sorulur). */
function askConsent() {
  show('consent');
  const boxes = ['cTerms', 'cKvkk', 'cAge'].map($);
  const sync = () => ($('consentBtn').disabled = !boxes.every((b) => b.checked));
  boxes.forEach((b) => (b.onchange = sync));
  sync();
  $('consentNo').onclick = async () => { await logout(); location.reload(); };
  return new Promise((resolve) => {
    $('consentBtn').onclick = async () => {
      const consent = { v: LEGAL_VERSION, at: Date.now(), kvkk: true, age18: true };
      await saveProfile(user.uid, { consent });
      profile.consent = consent;
      resolve();
    };
  });
}

async function route() {
  // Davet linkiyle geldiyse
  if (inviteCode) {
    const inv = await readInvite(inviteCode).catch(() => null);
    sessionStorage.removeItem('lr.davet');
    const code = inviteCode;
    inviteCode = null;
    if (!inv) toast(t('Davet linki geçersiz.'));
    else if (inv.room && (inv.room.a === user.uid || inv.room.b === user.uid)) return enterWorld(inv.rid);
    else if (profile.roomId) {
      const mine = await getRoom(profile.roomId).catch(() => null);
      if (mine?.b) toast(t('Zaten partnerinle bir odadasın.'));
      else return showInvite(inv, code);
    } else return showInvite(inv, code);
  }
  if (profile.roomId) {
    // Ev silinmişse (partner verilerini sildiyse) yeni ev kurma ekranına dön
    const r = await getRoom(profile.roomId).catch(() => null);
    if (r && (r.a === user.uid || r.b === user.uid)) return enterWorld(profile.roomId);
    await saveProfile(user.uid, { roomId: null });
    profile.roomId = null;
    if (!r) toast(t('Eviniz artık yok. Yeni bir ev kurabilirsin.'), 4000);
  }
  $('setupName').textContent = profile.name;
  show('setup');
}
$('createBtn').onclick = async () => {
  $('createBtn').disabled = true;
  try { const rid = await createRoom(user.uid); profile.roomId = rid; await enterWorld(rid, true); }
  catch (e) { toast(t('Ev kurulamadı. İnternet bağlantını kontrol et.')); console.warn(e); $('createBtn').disabled = false; }
};
[$('logoutBtn'), $('logoutBtn1')].forEach((b) => (b.onclick = async () => { await logout(); location.reload(); }));

function showInvite(inv, code) {
  show('invite');
  const who = inv.inviter?.name ?? t('Partnerin');
  if (inv.full) {
    $('inviteTitle').textContent = t('Bu oda dolu 💔');
    $('inviteText').textContent = t('{name} başka biriyle zaten aynı odada.', { name: who });
    $('acceptBtn').hidden = true;
  } else {
    $('inviteTitle').innerHTML = t('{name} seni odasına çağırıyor', { name: `<span>${esc(who)}</span>` });
    $('inviteText').textContent = t(inv.inviter?.side === 'moon' ? 'Sen güneş ☀️ olacaksın. Kabul edince aynı evdesiniz.' : 'Sen ay 🌙 olacaksın. Kabul edince aynı evdesiniz.');
    $('acceptBtn').hidden = false;
  }
  $('acceptBtn').onclick = async () => {
    $('acceptBtn').disabled = true;
    try { await acceptInvite(user.uid, inv.rid); profile = await getProfile(user.uid); await enterWorld(inv.rid); }
    catch (e) { toast(t('Odaya girilemedi.')); console.warn(e); $('acceptBtn').disabled = false; }
  };
  $('declineBtn').onclick = () => (profile.roomId ? enterWorld(profile.roomId) : (($('setupName').textContent = profile.name), show('setup')));
}

// ---------- Dünya ----------
async function enterWorld(rid, fresh = false) {
  show('world');
  const room = { data: await getRoom(rid) };
  let shared = { ...DEFAULT_STATE }, presence = {}, partnerProfile = null, catPos = null;
  // Veritabanı olayları, oyun ve arama nesneleri kurulmadan da gelebilir; o yüzden önceden tanımlı.
  let game = null, call = null, tv = null;
  const partnerUid = () => (room.data?.a === user.uid ? room.data?.b : room.data?.a) || null;
  const isHost = () => room.data?.a === user.uid;
  const partnerP = () => (partnerUid() ? presence[partnerUid()] : null);
  const pName = () => partnerProfile?.name ?? t('Partnerin');

  // Görüntü baloncukları (karakterlerin başının üstünde). Dokununca büyür.
  const ov = $('ov');
  const bubble = (cls) => {
    const d = h('div', { class: `bubble ${cls}`, hidden: true });
    const v = h('video', { autoplay: true, playsInline: true, muted: true });
    d.append(v); ov.append(d);
    d.onclick = () => { const b = openSheet({ title: cls === 'me' ? t('Sen') : pName(), iconName: 'cam', wide: true }); const big = h('video', { autoplay: true, playsInline: true, muted: true, class: 'bigvideo' + (cls === 'me' ? ' mirror' : '') }); big.srcObject = v.srcObject; b.append(big); };
    return { d, v };
  };
  const bMe = bubble('me'), bPartner = bubble('partner');

  // ---------- Ses: tarayıcı engelini bir dokunuşla aş ----------
  const media = () => [$('remoteAudio'), $('screenAudio')].filter((m) => m.srcObject);
  function tryPlay() {
    call?.unlock();
    return Promise.all(media().map((m) => m.play())).then(() => ($('soundBtn').hidden = true), () => ($('soundBtn').hidden = false));
  }
  $('soundBtn').onclick = tryPlay;
  addEventListener('pointerdown', () => { if (!$('soundBtn').hidden || media().some((m) => m.paused)) tryPlay(); }, { capture: true });

  const live = joinLive(rid, user.uid, {
    onRoom(r) {
      const before = partnerUid();
      room.data = r;
      const p = partnerUid();
      if (p && p !== before) { live.watchProfile(p, (pp) => (partnerProfile = pp)); toast(t('Partnerin eve katıldı 💞')); }
      updateTop();
    },
    onPresence(map) {
      const was = partnerP();
      presence = map;
      const now_ = partnerP();
      if (!!now_ !== !!was) {
        call?.setPartner(now_ ? partnerUid() : null);
        if (now_ && partnerProfile) toast(t('{name} geldi {icon} Sesli sohbet açık', { name: partnerProfile.name, icon: sideIcon(partnerProfile.side) }));
      }
      if (!!now_?.screen !== !!was?.screen) tv?.setScreen(now_?.screen ? call.remote.screen : call?.screenStream || null);
      updateTop();
    },
    onState: (s) => (shared = { ...DEFAULT_STATE, ...s }),
    onCat: (c) => (catPos = c),
    onFx(v) {
      if (!game) return;
      const who = v.from === user.uid ? 'me' : 'partner';
      if (v.kind === 'hug' || v.kind === 'kiss') {
        if (!game.emote(v.kind)) game.hearts(who);
        if (who === 'partner') toast(t(v.kind === 'hug' ? '{name} sana sarıldı 🤗' : '{name} seni öptü 💋', { name: pName() }));
      } else game.hearts(who);
    },
    onSignal: (m) => call?.onSignal(m),
  });
  if (partnerUid()) live.watchProfile(partnerUid(), (pp) => (partnerProfile = pp));

  call = createCall({
    uid: user.uid,
    send: (to, msg) => live.signal(to, msg),
    onRemote(slot, stream) {
      if (slot === 'audio') { $('remoteAudio').srcObject = stream; tryPlay(); }
      if (slot === 'screenAudio') { $('screenAudio').srcObject = stream; tryPlay(); }
      if (slot === 'cam') bPartner.v.srcObject = stream;
      if (slot === 'screen' && partnerP()?.screen) tv?.setScreen(stream);
    },
    onState(s) {
      if (s.camError) toast(s.camError, 5000);
      if (s.screen === false) { setBtn('screenBtn', false); live.setPresence({ screen: false }); tv?.setScreen(partnerP()?.screen ? call.remote.screen : null); }
      if (s.screenNoAudio) toast(t('Ses paylaşılmadı. Film sesi için "Sekme" seçip "Sekme sesini paylaş"ı işaretle.'), 6000);
      updateConn();
    },
  });
  await call.getMic();
  if (partnerP()) call.setPartner(partnerUid());

  const hourOf = (zone) => {
    try {
      const p = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(now()));
      return +p.find((x) => x.type === 'hour').value + +p.find((x) => x.type === 'minute').value / 60;
    } catch { return null; }
  };
  const previewHour = params.has('saat') ? +params.get('saat') : null;

  // Özellik modüllerinin ortak bağlamı
  const ctx = {
    uid: user.uid, live, call,
    partnerUid, partnerName: pName, partnerTz: () => partnerProfile?.tz, partnerOnline: () => !!partnerP(), partnerCam: () => !!partnerP()?.cam,
    rid, myName: () => profile.name, mySide: () => profile.side ?? 'sun', myLook: () => profile.look ?? DEFAULT_LOOK, isHost,
    partnerProfile: () => partnerProfile, shared: () => shared,
    screenAudio: $('screenAudio'),
    toggleScreen: () => $('screenBtn').onclick(),
    async shareMedia(stream) {
      const on = await call.useStream(stream);
      setBtn('screenBtn', on); live.setPresence({ screen: on });
      tv.setScreen(on ? call.screenStream : partnerP()?.screen ? call.remote.screen : null);
    },
    toggleMic: () => $('micBtn').onclick(), react: (k) => live.react(k),
    onRel: (t) => { $('relChip').textContent = t; $('relChip').hidden = !t; },
    onFrame: null,
  };
  let decor = null, care = null;

  game = createGame({
    canvas: $('c'), overlay: ov, stage: $('stage'),
    look: profile.look ?? DEFAULT_LOOK, side: profile.side ?? 'sun', name: profile.name,
    getShared: () => shared,
    getPartner() {
      const p = partnerP();
      if (!p || !partnerProfile) return null;
      return { ...p, look: partnerProfile.look ?? DEFAULT_LOOK, side: partnerProfile.side ?? 'moon', name: partnerProfile.name };
    },
    getHours: () => ({ hour: previewHour ?? hourOf(tz) ?? 12, partnerHour: partnerProfile?.tz && partnerProfile.tz !== tz ? hourOf(partnerProfile.tz) : null }),
    isHost,
    getCat: () => catPos,
    onCat: throttle((c) => live.setCat(c), 250),
    onPresence: (p) => live.setPresence(p),
    isTalking: (who) => (who === 'me' ? call.micOn && call.levels.me > 18 : !!partnerP() && call.levels.partner > 18),
    micOff: () => !call.micOn,
    placeVideo(who, x, y, visible) {
      const b = who === 'me' ? bMe : bPartner;
      const has = who === 'me' ? !!call.camStream : !!partnerP()?.cam;
      b.d.hidden = !(visible && has);
      if (!b.d.hidden) { b.d.style.left = (x / W) * 100 + '%'; b.d.style.top = (y / H) * 100 + '%'; }
    },
    onFrame: () => { tv?.place(); ctx.onFrame?.(); },
    onSpot: (id, s) => spot(id, s),
    onSceneChange: (s) => { toast(t(SCENES[s].name), 1400); care?.visit(s); },
    onTogether: () => { live.react('heart'); live.stat('together'); toast(t('Yan yanasınız 💞')); },
    onToast: toast,
    blockInput: () => !!document.querySelector('.modal:not([hidden])'),
    onDecorSelect: (s) => decor?.onSelect(s),
    onDecorMove: (m) => decor?.onMove(m),
  });
  ctx.game = game;

  tv = createTV(ctx);
  const spotify = createSpotify(ctx);
  const photos = createPhotos(ctx);
  ctx.photos = photos;
  const life = createLife(ctx);
  const draw = createDraw(ctx);
  care = createCare(ctx);
  const games = createGames(ctx);
  decor = createDecorUI(ctx);
  const pip = createPip(ctx);
  Object.assign(ctx, { life, draw, care });
  createChat(ctx);
  const share = createShare(ctx);
  const showcase = createShowcase(ctx);

  // Hata ayıklama için konsoldan erişim: window.__lr
  window.__lr = { game, get presence() { return presence; }, get partnerProfile() { return partnerProfile; }, get room() { return room.data; }, call, ctx };
  live.setPresence({ scene: 'salon', x: game.me.x, y: game.me.y, dir: 'up', mic: call.micOn, cam: false, screen: false, name: profile.name });

  function spot(id, s) {
    const toggle = (k) => live.setState({ [k]: !shared[k] });
    const actions = {
      tv: () => tv.open(),
      music: () => spotify.open(),
      lamp: () => toggle('lamp'),
      fire: () => toggle('fire'),
      lights: () => toggle('lights'),
      desk: () => toggle('desk'),
      jar: () => life.openJar(),
      bowl: () => care.care('food'),
      cat: () => care.openPet(),
      frame: () => photos.openFrame(s.frame),
      clock: () => life.openClock(),
      diary: () => life.openDiary(),
      foos: () => games.openFoos(),
      flower: () => care.openFlower(),
      easel: () => draw.open(),
      booth: () => photos.openBooth(),
      games: () => games.openHub(),
      wardrobe: () => {
        const b = openSheet({ title: t('Gardırop'), iconName: 'sofa' });
        b.append(
          h('button', { class: 'tile', onclick: () => { closeSheet(); openEditor(); } }, h('b', {}, t('Karakterim')), h('small', {}, t('Saç, kıyafet, güneş/ay'))),
          h('button', { class: 'tile', onclick: () => decor.open('shop') }, h('b', {}, t('Dekor dolabı')), h('small', {}, t('Eşya ekle, odayı boya, eşyaları taşı'))),
        );
      },
      sky() {
        const fmt = (z) => new Date(now()).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: z });
        const pn = partnerProfile?.name;
        toast(pn && partnerProfile?.tz ? t('Sende {mine} · {name} tarafında {theirs}', { mine: `${fmt(tz)} ${sideIcon(profile.side)}`, name: pn, theirs: `${fmt(partnerProfile.tz)} ${sideIcon(partnerProfile.side)}` }) : t('Saat {time}', { time: fmt(tz) }), 4000);
      },
    };
    actions[id]?.();
  }

  // ---------- Üst çubuk ----------
  function updateTop() {
    const p = partnerP();
    const name = partnerProfile?.name;
    $('inviteChip').hidden = !!partnerUid();
    $('status').textContent = !partnerUid()
      ? t('Partnerin henüz gelmedi')
      : p
        ? `${sideIcon(partnerProfile?.side)} ${name ?? ''} ${t(SCENE_AT[p.scene] ?? '')}`
        : t('{name} çevrimdışı', { name: name ?? t('Partnerin') });
    updateConn();
  }
  function updateConn() {
    const st = call?.status || {};
    const dot = $('connDot');
    const c = !partnerP() ? 'idle' : st.connection === 'connected' ? 'ok' : ['failed', 'disconnected'].includes(st.connection) ? 'bad' : 'wait';
    dot.className = 'conn ' + c;
    dot.title = t({ idle: 'Partner odada değil', ok: 'Sesli sohbet bağlı', bad: 'Bağlantı koptu: dokun', wait: 'Bağlanıyor…' }[c]);
    $('micWarn').hidden = st.mic !== 'error';
  }
  $('connDot').onclick = $('micWarn').onclick = openDiag;
  function openDiag() {
    const st = call.status;
    const b = openSheet({ title: t('Ses ve görüntü'), iconName: 'wifi' });
    const row = (k, v, ok) => h('div', { class: 'diag' }, h('span', {}, t(k)), h('b', { class: ok ? 'okc' : 'badc' }, t(v)));
    b.append(
      row('Mikrofon', st.mic === 'ok' ? (call.micOn ? 'açık' : 'sessizde') : 'izin yok', st.mic === 'ok'),
      st.micError ? h('p', { class: 'note' }, st.micError) : null,
      row('Partner', partnerP() ? 'odada' : 'odada değil', !!partnerP()),
      row('Bağlantı', { connected: 'bağlı', connecting: 'bağlanıyor…', new: 'bağlanıyor…', failed: 'kurulamadı', disconnected: 'koptu', idle: '—', closed: '—' }[st.connection] || st.connection, st.connection === 'connected'),
      st.route ? row('Yol', st.route, true) : null,
      h('div', { class: 'row wrap' },
        h('button', { class: 'primary', onclick: async () => { await call.getMic(); call.reconnect(); tryPlay(); toast(t('Yeniden bağlanılıyor…')); closeSheet(); } }, t('Yeniden bağlan')),
        h('button', { onclick: () => { tryPlay(); toast(t('Ses açıldı 🔊')); } }, t('Sesi aç')),
      ),
      h('p', { class: 'small' }, t('Ses gelmiyorsa: iki taraf da sayfaya bir kez dokunsun, mikrofona izin verilsin. Kulaklık kullanmak yankıyı önler.')),
    );
  }
  updateTop();

  // ---------- Alt çubuk ----------
  const setIcon = (id, name) => ($(id).innerHTML = icon(name));
  function setBtn(id, on) { $(id).classList.toggle('off', !on); $(id).classList.toggle('on', on); }
  setIcon('micBtn', call.micOn ? 'mic' : 'micOff'); setBtn('micBtn', call.micOn);
  setIcon('camBtn', 'camOff'); setIcon('screenBtn', 'screen'); setIcon('heartBtn', 'heart'); setIcon('hugBtn', 'hug'); setIcon('kissBtn', 'kiss'); setIcon('hubBtn', 'grid'); setIcon('menuBtn', 'menu');
  $('soundBtn').innerHTML = icon('sound') + `<span>${t('Sesi aç')}</span>`;
  $('micWarn').innerHTML = icon('micOff') + `<span>${t('Mikrofon kapalı')}</span>`;
  $('micBtn').onclick = async () => {
    if (!call.micOn && call.status.mic !== 'ok' && !(await call.getMic())) return openDiag();
    const on = call.toggleMic(); setBtn('micBtn', on); live.setPresence({ mic: on });
    setIcon('micBtn', on ? 'mic' : 'micOff'); updateConn();
  };
  $('camBtn').onclick = async () => {
    const on = await call.toggleCam(); setBtn('camBtn', on); live.setPresence({ cam: on });
    setIcon('camBtn', on ? 'cam' : 'camOff');
    bMe.v.srcObject = call.camStream;
  };
  $('screenBtn').onclick = async () => {
    // Telefonda tüm ekran paylaşılamaz: TV penceresindeki "Galeriden video / Kamera" seçenekleri açılır
    if (!call.canShareScreen) return tv.open();
    const on = await call.toggleScreen(); setBtn('screenBtn', on); live.setPresence({ screen: on });
    tv.setScreen(on ? call.screenStream : partnerP()?.screen ? call.remote.screen : null);
    if (on) { toast(t('Ekranın salondaki TV\'de 📺')); if (game.me.scene !== 'salon') tv.cinema(true); }
  };
  $('heartBtn').onclick = () => live.react('heart');
  const touch = (kind) => {
    if (!partnerP()) return toast(t('Partnerin odada değil'));
    const go = () => { live.react(kind); live.stat(kind === 'hug' ? 'hugs' : 'kisses'); };
    if (game.near()) return go();
    // Aynı odadaysanız karakterin partnerine yürür, varınca sarılır/öper
    if (game.sameRoom() && partnerP()?.seat < 0) return game.approach(go);
    toast(t(kind === 'hug' ? 'Sarılmak için aynı odaya git 🤗' : 'Öpmek için aynı odaya git 💋'));
  };
  $('hugBtn').onclick = () => touch('hug');
  $('kissBtn').onclick = () => touch('kiss');
  $('hubBtn').onclick = openHub;
  $('menuBtn').onclick = () => {
    $('inviteLink').textContent = `${APP_URL}?davet=${room.data?.info?.invite}`;
    $('menuInvite').hidden = !!partnerUid();
    $('zoomBtn').textContent = t(game.zoom === 'cover' ? 'Görünüm: yakın (tüm odayı göster)' : 'Görünüm: tüm oda (yakınlaştır)');
    $('menu').hidden = false;
  };
  $('zoomBtn').onclick = () => { game.setZoom(game.zoom === 'cover' ? 'contain' : 'cover'); $('menu').hidden = true; };
  $('fullBtn').onclick = fullscreen;
  $('inviteChip').onclick = $('menuBtn').onclick;
  $('copyBtn').onclick = async () => { await navigator.clipboard.writeText($('inviteLink').textContent); toast(t('Davet linki kopyalandı 💌')); };
  $('editBtn').onclick = () => { $('menu').hidden = true; openEditor(); };
  $('deleteBtn').onclick = () => { $('menu').hidden = true; confirmDelete(); };

  // ---------- Verilerimi sil ----------
  function confirmDelete() {
    const b = openSheet({ title: t('Verilerimi sil'), iconName: 'trash' });
    const word = t('SİL');
    const input = h('input', { placeholder: word, autocomplete: 'off' });
    b.append(
      h('p', {}, t('Hesabın, profilin ve ortak eviniz kalıcı olarak silinir: tablolar, albüm, günlük, mektuplar, çizimler, cevaplar, kedi ve çiçek dahil. Bu, partnerinin eklediği içerikleri de siler ve geri alınamaz.')),
      h('p', { class: 'small' }, t('Önce saklamak istediğiniz fotoğrafları Albüm → Galeriye kaydet ile indirmenizi öneririz.')),
      h('label', {}, t('Onaylamak için {word} yaz', { word }), input),
      h('button', { class: 'danger', onclick: async () => {
        if (input.value.trim().toLocaleUpperCase(locale) !== word.toLocaleUpperCase(locale)) return input.focus();
        try { await deleteEverything(); }
        catch (e) { console.warn(e); toast(t('Silme tamamlanamadı.') + ' ' + (e.code || e.message || ''), 6000); }
      } }, t('Her şeyi kalıcı olarak sil')),
    );
  }
  async function deleteEverything() {
    toast(t('Siliniyor…'), 8000);
    call.setPartner(null);
    game.stop(); live.leave();
    const r = room.data;
    const sc = (await get(ref(db, `live/${rid}/showcase`)).catch(() => null))?.val();
    if (sc) await remove(ref(db, `showcase/${sc}`)).catch(() => {});
    if (r?.info?.invite) await remove(ref(db, `invites/${r.info.invite}`)).catch(() => {});
    await remove(ref(db, `live/${rid}`));
    await remove(ref(db, `rooms/${rid}`));
    await remove(ref(db, `users/${user.uid}`));
    try { await deleteUser(auth.currentUser); }
    catch (e) {
      if (e.code === 'auth/requires-recent-login') { await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider()); await deleteUser(auth.currentUser); }
      else throw e;
    }
    localStorage.clear(); sessionStorage.clear();
    alert(t('Tüm verilerin silindi. Get Love Room’u denediğin için teşekkürler 💛'));
    location.href = location.pathname;
  }
  document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => { const m = b.closest('.modal'); if (m.id === 'sheet') closeSheet(); else m.hidden = true; }));
  document.querySelectorAll('.modal').forEach((m) => m.addEventListener('pointerdown', (e) => e.target === m && (m.id === 'sheet' ? closeSheet() : (m.hidden = true))));
  addEventListener('keydown', (e) => e.key === 'Escape' && closeSheet());

  function fullscreen() {
    $('menu').hidden = true;
    const d = document.documentElement;
    if (document.fullscreenElement) return document.exitFullscreen();
    if (d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
    else toast(t('iPhone\'da tam ekran için: Paylaş → "Ana Ekrana Ekle", sonra oradan aç.'), 5000);
  }

  // ---------- Birlikte (aktivite menüsü) ----------
  function openHub() {
    const b = openSheet({ title: t('Birlikte'), iconName: 'grid', wide: true });
    const tile = (ic, name, where, fn) => h('button', { class: 'hubtile', onclick: () => { closeSheet(); fn(); } }, h('span', { class: 'hi', html: icon(ic) }), h('b', {}, t(name)), h('small', {}, t(where)));
    b.append(h('div', { class: 'hubgrid' },
      tile('tv', 'Film izle', 'Salon · TV', () => tv.open()),
      tile('music', 'Müzik', 'Salon · pikap', () => spotify.open()),
      tile('brush', 'Birlikte çiz', 'Hobi · şövale', () => draw.open()),
      tile('booth', 'Fotoğraf kabini', 'Hobi köşesi', () => photos.openBooth()),
      tile('album', 'Albümümüz', 'Anılar', () => photos.openAlbum()),
      tile('jar', 'Soru kavanozu', 'Salon', () => life.openJar()),
      tile('book', 'Günlük', 'Şömine · kitaplık', () => life.openDiary()),
      tile('clock', 'İlişki saati', 'Şömine', () => life.openClock()),
      tile('game', 'Oyunlar', 'XOX · Hafıza · Langırt', () => games.openHub()),
      tile('paw', 'Evcil dostumuz', 'Kedi · köpek · tavşan', () => care.openPet()),
      tile('flower', 'Çiçeğimiz', 'Balkon', () => care.openFlower()),
      tile('badge', 'Rozetler', 'Başarılar', () => care.openBadges()),
      tile('paint', 'Evi düzenle', 'Eşya, boya, taşı', () => decor.open('shop')),
      tile('eye', 'Evimizi göster', 'Linkle arkadaşlarına', () => showcase.open()),
      tile('share', 'Paylaş', 'Hikâye ve kare şablonlar', () => share.open()),
      pip.supported ? tile('pip', 'Küçük pencere', 'Başka işle uğraşırken', () => pip.toggle()) : null,
      tile('full', 'Tam ekran', 'Bu cihazda', fullscreen),
    ));
  }

  if (fresh) setTimeout(() => $('menuBtn').onclick(), 600);
  if (spotifyReturn) {
    if (spotifyReturn.error) toast(spotifyReturn.error, 6000);
    else { toast(t('Spotify bağlandı 🎵')); }
    if (sessionStorage.getItem('lr.sp.back')) { sessionStorage.removeItem('lr.sp.back'); setTimeout(() => spotify.open(), 500); }
  }

  // ---------- Karakter düzenleyici ----------
  function openEditor() {
    const look = { ...DEFAULT_LOOK, ...profile.look };
    let side = profile.side ?? 'sun';
    $('edName').value = profile.name;
    const pc = $('preview').getContext('2d');
    const draw_ = () => {
      pc.imageSmoothingEnabled = false;
      pc.clearRect(0, 0, 40, 40);
      const img = characterSprites(look).down, b = side === 'moon' ? MOON_BADGE : SUN_BADGE;
      pc.drawImage(img, 20 - img.width / 2, 38 - img.height);
      pc.drawImage(b, 20 - b.width / 2, 38 - img.height - b.height - 1);
    };
    const opts = (id, label, items, cur, set, isColor) => {
      const box = $(id);
      box.innerHTML = `<span class="lbl">${t(label)}</span>`;
      items.forEach((it, i) => {
        const b = document.createElement('button');
        if (isColor) { b.className = 'sw'; b.style.background = it; } else b.textContent = t(it.label);
        const val = isColor ? i : it.value;
        if (val === cur()) b.classList.add('sel');
        b.onclick = () => { set(val); [...box.querySelectorAll('button')].forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); draw_(); };
        box.appendChild(b);
      });
    };
    opts('edSide', 'Güneş mi ay mı?', [{ label: '☀️ Güneş', value: 'sun' }, { label: '🌙 Ay', value: 'moon' }], () => side, (v) => (side = v));
    opts('edHair', 'Saç', HAIR_STYLES.map((x) => ({ label: { short: 'Kısa', long: 'Uzun', bob: 'Küt', bun: 'Topuz', none: 'Saçsız' }[x], value: x })), () => look.hair, (v) => (look.hair = v));
    opts('edHairColor', 'Saç rengi', HAIR, () => look.hairColor, (v) => (look.hairColor = v), true);
    opts('edSkin', 'Ten', SKIN, () => look.skin, (v) => (look.skin = v), true);
    const OUTFIT_NAMES = { basic: 'Sade', tee: 'Tişört', nordic: 'Desenli kazak', nordicPink: 'Pembe kazak', cardigan: 'Hırka', cardiganBeige: 'Bej hırka', sweater: 'Siyah kazak' };
    opts('edOutfit', 'Kıyafet modeli', OUTFIT_IDS.map((x) => ({ label: OUTFIT_NAMES[x], value: x })), () => look.outfit, (v) => (look.outfit = v));
    opts('edShirt', 'Kıyafet rengi (sade ve tişört)', SHIRT, () => look.shirt, (v) => (look.shirt = v), true);
    opts('edPants', 'Pantolon', PANTS, () => look.pants, (v) => (look.pants = v), true);
    draw_();
    $('editor').hidden = false;
    $('edSave').onclick = async () => {
      const name = $('edName').value.trim() || profile.name;
      profile = { ...profile, look, side, name };
      await saveProfile(user.uid, { look, side, name });
      game.setLook(look, side, name);
      live.setPresence({ name });
      $('editor').hidden = true;
      toast(t('Karakterin güncellendi ✨'));
    };
  }
}

function throttle(fn, ms) {
  let last = 0;
  return (...a) => { const n = Date.now(); if (n - last >= ms) { last = n; fn(...a); } };
}

boot();
