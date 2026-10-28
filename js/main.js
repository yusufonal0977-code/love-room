// Love Room — giriş akışı ve dünya: açılış → giriş → (davet | ev kurma) → oda.
import { auth, firstUser, loginGoogle, loginGuest, logout, now } from './fb.js';
import { acceptInvite, createRoom, getProfile, getRoom, joinLive, readInvite, saveProfile } from './net.js';
import { createGame } from './game.js';
import { createCall } from './call.js';
import { DEFAULT_STATE, SCENES, W, H } from './scenes.js';
import { APP_URL } from './config.js';
import { DEFAULT_LOOK, HAIR, HAIR_STYLES, PANTS, SHIRT, SKIN, characterSprites, SUN_BADGE, MOON_BADGE } from './art.js';

const $ = (id) => document.getElementById(id);
const show = (id) => ['gate', 'setup', 'invite', 'world'].forEach((s) => ($(s).hidden = s !== id));
let toastT;
function toast(msg, ms = 2800) {
  const t = $('toast');
  t.textContent = msg;
  t.style.opacity = 1;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.style.opacity = 0), ms);
}
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const SCENE_TR = { salon: 'salonda', somine: 'şömine başında', balkon: 'balkonda', hobi: 'hobi köşesinde' };

// Davet kodu adresten okunur (?davet=...); giriş sonrası kullanılmak üzere saklanır.
const params = new URLSearchParams(location.search);
let inviteCode = params.get('davet') || sessionStorage.getItem('lr.davet');
if (params.get('davet')) {
  sessionStorage.setItem('lr.davet', inviteCode);
  history.replaceState(null, '', location.pathname);
}

let user = null, profile = null;

async function boot() {
  const intro = new Promise((r) => setTimeout(r, 2600));
  const [u] = await Promise.all([firstUser(), intro]);
  $('intro').remove();
  if (u) await afterLogin(u);
  else showGate();
}

// ---------- Giriş ----------
function showGate() {
  show('gate');
  if (inviteCode) $('gateNote').textContent = 'Partnerin seni bekliyor 💌 Giriş yap ve odaya gel.';
}
$('googleBtn').onclick = async () => {
  try { const r = await loginGoogle(); await afterLogin(r.user); }
  catch (e) { $('gateErr').textContent = 'Google girişi tamamlanamadı. Tekrar dene.'; console.warn(e); }
};
$('guestBtn').onclick = guest;
$('nameIn').addEventListener('keydown', (e) => e.key === 'Enter' && guest());
async function guest() {
  const name = $('nameIn').value.trim();
  if (!name) { $('nameIn').focus(); return; }
  try { const r = await loginGuest(); await afterLogin(r.user, name); }
  catch (e) { $('gateErr').textContent = 'Giriş yapılamadı. İnternet bağlantını kontrol et.'; console.warn(e); }
}

async function afterLogin(u, guestName) {
  user = u;
  profile = await getProfile(u.uid).catch((e) => { console.warn(e); return null; });
  if (!profile) {
    const name = guestName || u.displayName?.split(' ')[0] || 'Sevgili';
    profile = { name, look: { ...DEFAULT_LOOK, shirt: Math.floor(Math.random() * SHIRT.length) }, side: 'sun', tz };
    await saveProfile(u.uid, profile);
  } else if (profile.tz !== tz) saveProfile(u.uid, { tz });
  await route();
}

async function route() {
  // Davet linkiyle geldiyse
  if (inviteCode) {
    const inv = await readInvite(inviteCode).catch(() => null);
    sessionStorage.removeItem('lr.davet');
    const code = inviteCode;
    inviteCode = null;
    if (!inv) toast('Davet linki geçersiz.');
    else if (inv.room && (inv.room.a === user.uid || inv.room.b === user.uid)) return enterWorld(inv.rid);
    else if (profile.roomId) {
      const mine = await getRoom(profile.roomId).catch(() => null);
      if (mine?.b) toast('Zaten partnerinle bir odadasın.');
      else return showInvite(inv, code);
    } else return showInvite(inv, code);
  }
  if (profile.roomId) return enterWorld(profile.roomId);
  $('setupName').textContent = profile.name;
  show('setup');
}
$('createBtn').onclick = async () => {
  $('createBtn').disabled = true;
  try { const rid = await createRoom(user.uid); profile.roomId = rid; await enterWorld(rid, true); }
  catch (e) { toast('Ev kurulamadı. Veritabanı kuralları ayarlı mı?'); console.warn(e); $('createBtn').disabled = false; }
};
[$('logoutBtn'), $('logoutBtn1')].forEach((b) => (b.onclick = async () => { await logout(); location.reload(); }));

function showInvite(inv, code) {
  show('invite');
  const who = inv.inviter?.name ?? 'Partnerin';
  if (inv.full) {
    $('inviteTitle').textContent = 'Bu oda dolu 💔';
    $('inviteText').textContent = `${who} başka biriyle zaten aynı odada.`;
    $('acceptBtn').hidden = true;
  } else {
    $('inviteTitle').innerHTML = `<span>${esc(who)}</span> seni odasına çağırıyor`;
    $('inviteText').textContent = `Sen ${inv.inviter?.side === 'moon' ? 'güneş ☀️' : 'ay 🌙'} olacaksın. Kabul edince aynı evdesiniz.`;
    $('acceptBtn').hidden = false;
  }
  $('acceptBtn').onclick = async () => {
    $('acceptBtn').disabled = true;
    try { await acceptInvite(user.uid, inv.rid); profile = await getProfile(user.uid); await enterWorld(inv.rid); }
    catch (e) { toast('Odaya girilemedi.'); console.warn(e); $('acceptBtn').disabled = false; }
  };
  $('declineBtn').onclick = () => (profile.roomId ? enterWorld(profile.roomId) : (($('setupName').textContent = profile.name), show('setup')));
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- Dünya ----------
async function enterWorld(rid, fresh = false) {
  show('world');
  const room = { data: await getRoom(rid) };
  let shared = { ...DEFAULT_STATE }, presence = {}, partnerProfile = null, catPos = null;
  // Veritabanı olayları, oyun ve arama nesneleri kurulmadan da gelebilir; o yüzden önceden tanımlı.
  let game = null, call = null;
  const partnerUid = () => (room.data?.a === user.uid ? room.data?.b : room.data?.a) || null;
  const isHost = () => room.data?.a === user.uid;
  const partnerP = () => (partnerUid() ? presence[partnerUid()] : null);

  // Görüntü baloncukları ve ekran paylaşımı katmanları
  const ov = $('ov');
  const bubble = (cls) => { const d = document.createElement('div'); d.className = `bubble ${cls}`; d.hidden = true; const v = document.createElement('video'); v.autoplay = v.playsInline = v.muted = true; d.appendChild(v); ov.appendChild(d); return { d, v }; };
  const bMe = bubble('me'), bPartner = bubble('partner');
  const tv = document.createElement('div'); tv.className = 'tvscreen'; tv.hidden = true;
  const tvVideo = document.createElement('video'); tvVideo.autoplay = tvVideo.playsInline = tvVideo.muted = true; tv.appendChild(tvVideo); ov.appendChild(tv);
  Object.assign(tv.style, { left: `${(7 / W) * 100}%`, top: `${(30 / H) * 100}%`, width: `${(28 / W) * 100}%`, height: `${(18 / H) * 100}%` });
  tv.onclick = () => { $('screenBig').srcObject = tvVideo.srcObject; $('screenView').hidden = false; };

  const live = joinLive(rid, user.uid, {
    onRoom(r) {
      const before = partnerUid();
      room.data = r;
      const p = partnerUid();
      if (p && p !== before) { live.watchProfile(p, (pp) => (partnerProfile = pp)); toast('Partnerin eve katıldı 💞'); }
      updateTop();
    },
    onPresence(map) {
      const was = !!partnerP();
      presence = map;
      const on = !!partnerP();
      if (on !== was) {
        call?.setPartner(on ? partnerUid() : null);
        if (on && partnerProfile) toast(`${partnerProfile.name} geldi ${partnerProfile.side === 'moon' ? '🌙' : '☀️'} Sesli sohbet açık`);
      }
      updateTop();
    },
    onState: (s) => (shared = { ...DEFAULT_STATE, ...s }),
    onCat: (c) => (catPos = c),
    onFx(v) {
      if (!game) return;
      const who = v.from === user.uid ? 'me' : 'partner';
      const emoji = v.kind === 'hug' ? '🤗' : '💗';
      game.fxOn(who, emoji);
      if (v.kind === 'hug') {
        game.fxOn(who === 'me' ? 'partner' : 'me', '💞');
        if (who === 'partner') toast(`${partnerProfile?.name ?? 'Partnerin'} sana sarıldı 🤗`);
      } else if (who === 'partner') game.fxOn('partner', '💗');
    },
    onSignal: (m) => call?.onSignal(m),
  });
  if (partnerUid()) live.watchProfile(partnerUid(), (pp) => (partnerProfile = pp));

  call = createCall({
    uid: user.uid,
    send: (to, msg) => live.signal(to, msg),
    onRemote(slot, stream) {
      if (slot === 'audio') { $('remoteAudio').srcObject = stream; $('remoteAudio').play().catch(() => {}); }
      if (slot === 'cam') bPartner.v.srcObject = stream;
      if (slot === 'screen') tvVideo.srcObject = stream;
    },
    onState(s) {
      if (s.micError) { toast('Mikrofon izni verilmedi; sesini duyamayacak ama sen onu duyabilirsin.', 4000); setBtn('micBtn', false); }
      if (s.camError) toast('Kamera açılamadı.');
      if (s.screen === false) { setBtn('screenBtn', false); live.setPresence({ screen: false }); }
    },
  });
  await call.getMic();
  setBtn('micBtn', call.micOn);
  if (partnerP()) call.setPartner(partnerUid());

  const hourOf = (zone) => {
    try {
      const p = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(now()));
      return +p.find((x) => x.type === 'hour').value + +p.find((x) => x.type === 'minute').value / 60;
    } catch { return null; }
  };
  const previewHour = params.has('saat') ? +params.get('saat') : null;

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
      // TV'de ekran paylaşımı: salondayken TV'de görünür
      tv.hidden = !(game?.me.scene === 'salon' && (partnerP()?.screen || call.screenStream));
    },
    onSpot: (id) => spot(id),
    onSceneChange: (s) => toast(SCENES[s].name, 1400),
    onTogether: () => { live.react('heart'); toast('Yan yanasınız 💞'); },
    onToast: toast,
  });
  // Hata ayıklama için konsoldan erişim: window.__lr
  window.__lr = { game, get presence() { return presence; }, get partnerProfile() { return partnerProfile; }, get room() { return room.data; }, call };
  live.setPresence({ scene: 'salon', x: game.me.x, y: game.me.y, dir: 'down', mic: call.micOn, cam: false, screen: false, name: profile.name });

  function spot(id) {
    const toggle = (k) => live.setState({ [k]: !shared[k] });
    if (id === 'tv') {
      if (partnerP()?.screen || call.screenStream) { tv.onclick(); return; }
      toggle('tv'); toast(shared.tv ? 'TV kapandı' : 'TV açıldı 📺  (ekranını yansıtmak için 🖥️)');
    }
    if (id === 'lamp') toggle('lamp');
    if (id === 'fire') toggle('fire');
    if (id === 'lights') toggle('lights');
    if (id === 'desk') toggle('desk');
    if (id === 'wardrobe') openEditor();
    if (id === 'clock') {
      const days = room.data?.info?.createdAt ? Math.floor((now() - room.data.info.createdAt) / 86_400_000) : 0;
      toast(`Bu evde ${days + 1}. gününüz 💞`);
    }
    if (id === 'sky') {
      const fmt = (z) => new Date(now()).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: z });
      const pn = partnerProfile?.name;
      toast(pn && partnerProfile?.tz ? `Sende ${fmt(tz)} ${profile.side === 'moon' ? '🌙' : '☀️'} · ${pn}'de ${fmt(partnerProfile.tz)} ${partnerProfile.side === 'moon' ? '🌙' : '☀️'}` : `Saat ${fmt(tz)}`, 4000);
    }
    if (id === 'easel') toast('Birlikte resim çizme yakında burada 🎨');
    if (id === 'booth') toast('Fotoğraf kabini yakında burada 📸');
  }

  function updateTop() {
    const p = partnerP();
    const name = partnerProfile?.name;
    $('inviteChip').hidden = !!partnerUid();
    $('status').textContent = !partnerUid()
      ? 'Partnerin henüz gelmedi'
      : p
        ? `${partnerProfile?.side === 'moon' ? '🌙' : '☀️'} ${name ?? ''} ${SCENE_TR[p.scene] ?? ''}`
        : `${name ?? 'Partnerin'} çevrimdışı`;
  }
  updateTop();

  // ---------- Alt çubuk ----------
  function setBtn(id, on) { $(id).classList.toggle('off', !on); $(id).classList.toggle('on', on); }
  $('micBtn').onclick = async () => {
    if (!call.micOn && !(await call.getMic())) return;
    const on = call.toggleMic(); setBtn('micBtn', on); live.setPresence({ mic: on });
    $('micBtn').textContent = on ? '🎙️' : '🔇';
  };
  $('camBtn').onclick = async () => {
    const on = await call.toggleCam(); setBtn('camBtn', on); live.setPresence({ cam: on });
    bMe.v.srcObject = call.camStream;
  };
  if (!navigator.mediaDevices?.getDisplayMedia) $('screenBtn').hidden = true;
  $('screenBtn').onclick = async () => {
    const on = await call.toggleScreen(); setBtn('screenBtn', on); live.setPresence({ screen: on });
    if (on) { tvVideo.srcObject = call.screenStream; toast('Ekranın salondaki TV\'de 📺'); }
  };
  $('heartBtn').onclick = () => live.react('heart');
  $('hugBtn').onclick = () => {
    if (!game.near()) return toast(partnerP() ? 'Sarılmak için yanına git 🤗' : 'Partnerin odada değil');
    live.react('hug');
  };
  $('menuBtn').onclick = () => {
    $('inviteLink').textContent = `${APP_URL}?davet=${room.data?.info?.invite}`;
    $('menuInvite').hidden = !!partnerUid();
    $('menu').hidden = false;
  };
  $('inviteChip').onclick = $('menuBtn').onclick;
  $('copyBtn').onclick = async () => { await navigator.clipboard.writeText($('inviteLink').textContent); toast('Davet linki kopyalandı 💌'); };
  $('editBtn').onclick = () => { $('menu').hidden = true; openEditor(); };
  document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => (b.closest('.modal').hidden = true)));
  document.querySelectorAll('.modal').forEach((m) => m.addEventListener('pointerdown', (e) => e.target === m && (m.hidden = true)));

  if (fresh) setTimeout(() => $('menuBtn').onclick(), 600);

  // ---------- Karakter düzenleyici ----------
  function openEditor() {
    const look = { ...DEFAULT_LOOK, ...profile.look };
    let side = profile.side ?? 'sun';
    $('edName').value = profile.name;
    const pc = $('preview').getContext('2d');
    const draw = () => {
      pc.imageSmoothingEnabled = false;
      pc.clearRect(0, 0, 40, 40);
      const img = characterSprites(look).down, b = side === 'moon' ? MOON_BADGE : SUN_BADGE;
      pc.drawImage(img, 20 - img.width / 2, 38 - img.height);
      pc.drawImage(b, 20 - b.width / 2, 38 - img.height - b.height - 1);
    };
    const opts = (id, label, items, cur, set, isColor) => {
      const box = $(id);
      box.innerHTML = `<span class="lbl">${label}</span>`;
      items.forEach((it, i) => {
        const b = document.createElement('button');
        if (isColor) { b.className = 'sw'; b.style.background = it; } else b.textContent = it.label;
        const val = isColor ? i : it.value;
        if (val === cur()) b.classList.add('sel');
        b.onclick = () => { set(val); [...box.querySelectorAll('button')].forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); draw(); };
        box.appendChild(b);
      });
    };
    opts('edSide', 'Güneş mi ay mı?', [{ label: '☀️ Güneş', value: 'sun' }, { label: '🌙 Ay', value: 'moon' }], () => side, (v) => (side = v));
    opts('edHair', 'Saç', HAIR_STYLES.map((h) => ({ label: { short: 'Kısa', long: 'Uzun', bun: 'Topuz' }[h], value: h })), () => look.hair, (v) => (look.hair = v));
    opts('edHairColor', 'Saç rengi', HAIR, () => look.hairColor, (v) => (look.hairColor = v), true);
    opts('edSkin', 'Ten', SKIN, () => look.skin, (v) => (look.skin = v), true);
    opts('edShirt', 'Kıyafet', SHIRT, () => look.shirt, (v) => (look.shirt = v), true);
    opts('edPants', 'Pantolon', PANTS, () => look.pants, (v) => (look.pants = v), true);
    draw();
    $('editor').hidden = false;
    $('edSave').onclick = async () => {
      const name = $('edName').value.trim() || profile.name;
      profile = { ...profile, look, side, name };
      await saveProfile(user.uid, { look, side, name });
      game.setLook(look, side, name);
      live.setPresence({ name });
      $('editor').hidden = true;
      toast('Karakterin güncellendi ✨');
    };
  }
}

function throttle(fn, ms) {
  let last = 0;
  return (...a) => { const n = Date.now(); if (n - last >= ms) { last = n; fn(...a); } };
}

boot();
