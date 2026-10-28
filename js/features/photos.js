// Fotoğraflar: duvardaki tablolar, ortak albüm ve fotoğraf kabini.
//
// live/{rid}/frames/{çerçeve} = { img, by, at }        (tablodaki foto; sahnede piksel haliyle görünür)
// live/{rid}/album/{id}       = { img, title, by, at }  (kabin şeritleri ve eklenen anılar)
// live/{rid}/booth           = { mode, slots: {uid: img}, shot: {at, by} }
import { h, icon, openSheet, closeSheet, toast, pickImage, compressImage, loadImg, saveImage, fmtDate } from '../ui.js';
import { get, limitToLast, push, query, remove, serverTimestamp, set, now } from '../fb.js';
import { DECOR, SCENES, bump } from '../scenes.js';

const FRAMES = Object.values(SCENES).flatMap((s) => (s.frames || []).map((f) => ({ ...f, scene: s.name, sceneId: s.id })));

export function createPhotos(ctx) {
  const { live, uid } = ctx;
  let frames = {}, booth = {}, boothBody = null, camStream = null, ownCam = false, shotTimer = null;

  live.on('frames', (v) => {
    frames = v || {};
    for (const f of FRAMES) {
      const img = frames[f.id]?.img;
      if (img) DECOR.frames[f.id] = true; else delete DECOR.frames[f.id];
      ctx.game.setPicture('frame:' + f.id, f.sceneId, [f.x, f.y, f.w, f.h], img || null);
    }
    bump();
  });

  async function addToAlbum(img, title) {
    await push(live.ref('album'), { img, title: title || '', by: uid, at: serverTimestamp() });
    live.stat('photos');
  }

  // ---------- Tablolar ----------
  function openFrame(id) {
    const f = FRAMES.find((x) => x.id === id);
    const cur = frames[id];
    const body = openSheet({ title: 'Tablo', iconName: 'album' });
    if (cur?.img) body.append(h('img', { class: 'bigphoto', src: cur.img, alt: '' }), h('small', {}, `${fmtDate(cur.at || now())} · ${cur.by === uid ? 'sen astın' : ctx.partnerName() + ' astı'}`));
    else body.append(h('p', {}, 'Bu çerçeve boş. Bir fotoğrafınızı koyun, evde piksel tablo olarak dursun.'));
    body.append(h('div', { class: 'row wrap' },
      h('button', { class: 'primary', html: `${icon('upload')} Fotoğraf koy`, onclick: async () => {
        const file = await pickImage();
        if (!file) return;
        const img = await compressImage(file, 720);
        await set(live.ref(`frames/${id}`), { img, by: uid, at: serverTimestamp() });
        if (confirm('Albüme de eklensin mi?')) addToAlbum(img, f.scene);
        closeSheet(); toast('Tabloya asıldı 🖼️');
      } }),
      h('button', { onclick: () => openAlbum((img) => set(live.ref(`frames/${id}`), { img, by: uid, at: serverTimestamp() }).then(() => toast('Tabloya asıldı 🖼️'))) }, 'Albümden seç'),
      cur ? h('button', { class: 'link', onclick: () => { remove(live.ref(`frames/${id}`)); closeSheet(); } }, 'Çerçeveyi boşalt') : null,
    ));
  }

  // ---------- Albüm ----------
  async function openAlbum(pickCb) {
    const body = openSheet({ title: pickCb ? 'Albümden seç' : 'Albümümüz', iconName: 'album', wide: true });
    const grid = h('div', { class: 'album' }, h('p', { class: 'small' }, 'Yükleniyor…'));
    body.append(
      pickCb ? null : h('div', { class: 'row' }, h('button', { html: `${icon('upload')} Anı ekle`, onclick: async () => {
        const file = await pickImage();
        if (!file) return;
        const title = prompt('Bu anıya bir başlık? (boş bırakabilirsin)') || '';
        await addToAlbum(await compressImage(file, 900, 0.8), title);
        openAlbum();
      } }), h('button', { onclick: openBooth, html: `${icon('booth')} Fotoğraf kabini` })),
      grid,
    );
    const snap = await get(query(live.ref('album'), limitToLast(80)));
    const items = [];
    snap.forEach((c) => { items.unshift({ key: c.key, ...c.val() }); });
    grid.innerHTML = '';
    if (!items.length) grid.append(h('p', { class: 'small' }, 'Henüz fotoğraf yok. Kabinde bir şerit çekin ya da bir anı ekleyin.'));
    items.forEach((it) => grid.append(h('figure', { onclick: () => (pickCb ? (pickCb(it.img), closeSheet()) : viewPhoto(it)) }, h('img', { src: it.img, alt: '', loading: 'lazy' }), it.title ? h('figcaption', {}, it.title) : null)));
  }
  function viewPhoto(it) {
    const body = openSheet({ title: it.title || fmtDate(it.at || now()), iconName: 'album', wide: true });
    body.append(h('img', { class: 'bigphoto', src: it.img, alt: '' }), h('small', {}, fmtDate(it.at || now())),
      h('div', { class: 'row wrap' },
        h('button', { class: 'primary', html: `${icon('download')} Galeriye kaydet`, onclick: () => saveImage(it.img, `love-room-${it.key}.jpg`) }),
        ...FRAMES.map((f) => h('button', { onclick: async () => { await set(live.ref(`frames/${f.id}`), { img: await compressImage(it.img, 720), by: uid, at: serverTimestamp() }); toast(`${f.scene} tablosuna asıldı`); } }, `${f.scene} tablosuna as`)),
        h('button', { class: 'link', onclick: () => { if (confirm('Bu fotoğraf albümden silinsin mi?')) { remove(live.ref(`album/${it.key}`)); openAlbum(); } } }, 'Sil'),
        h('button', { class: 'link', onclick: () => openAlbum() }, 'Albüme dön'),
      ));
  }

  // ---------- Fotoğraf kabini ----------
  live.on('booth', (v) => {
    const prevShot = booth.shot?.at;
    booth = v || {};
    if (booth.shot?.at && booth.shot.at !== prevShot) scheduleShot(booth.shot.at);
    renderBooth();
  });

  async function startCam(video) {
    if (!camStream) {
      if (ctx.call.camStream) camStream = ctx.call.camStream;
      else { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } } }); ownCam = true; }
    }
    video.srcObject = camStream;
    video.play().catch(() => {});
  }
  function stopCam() {
    if (ownCam) camStream?.getTracks().forEach((t) => t.stop());
    camStream = null; ownCam = false;
  }
  async function snap() {
    const v = boothBody?.querySelector('video.live');
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    const s = Math.min(v.videoWidth, v.videoHeight);
    c.width = c.height = 480;
    const g = c.getContext('2d');
    g.translate(480, 0); g.scale(-1, 1); // ayna
    g.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, 480, 480);
    await set(live.ref(`booth/slots/${uid}`), c.toDataURL('image/jpeg', 0.8));
  }
  function scheduleShot(at) {
    clearTimeout(shotTimer);
    const ms = at - now();
    if (ms < -1500 || !boothBody) return;
    const tick = () => {
      const cd = boothBody?.querySelector('.countdown');
      const left = Math.ceil((at - now()) / 1000);
      if (cd) cd.textContent = left > 0 ? left : '📸';
      if (left > 0) shotTimer = setTimeout(tick, 200);
      else { snap(); setTimeout(() => { const c2 = boothBody?.querySelector('.countdown'); if (c2) c2.textContent = ''; }, 600); }
    };
    tick();
  }

  function renderBooth() {
    if (!boothBody || !document.body.contains(boothBody)) return;
    const b = boothBody;
    const mode = booth.mode || 'now';
    const slots = booth.slots || {};
    const pu = ctx.partnerUid();
    b.innerHTML = '';
    b.append(h('div', { class: 'tabs' },
      h('button', { class: mode === 'now' ? 'sel' : '', onclick: () => set(live.ref('booth/mode'), 'now') }, 'Şimdi'),
      h('button', { class: mode === 'kid' ? 'sel' : '', onclick: () => set(live.ref('booth/mode'), 'kid') }, 'Çocukluğumuz'),
      h('button', { class: mode === 'then' ? 'sel' : '', onclick: () => set(live.ref('booth/mode'), 'then') }, 'Bir anı'),
    ));
    b.append(h('p', { class: 'small' }, mode === 'now' ? 'İkiniz de kameranı aç, "Birlikte çek" deyin: aynı anda geri sayım başlar, iki kare yan yana şerit olur.' : mode === 'kid' ? 'Küçüklük fotoğraflarınızı yükleyin: yan yana "Biz küçükken" şeridi olsun.' : 'Aynı ana ait iki fotoğraf: ilk buluşma, ilk mesaj, aynı şehirde çekilmiş iki kare…'));
    const slot = (who) => {
      const mine = who === uid;
      const img = slots[who];
      const box = h('div', { class: 'slot' });
      if (img) box.append(h('img', { src: img, alt: '' }));
      else if (mine && mode === 'now') { const v = h('video', { class: 'live', playsInline: true, muted: true, autoplay: true }); box.append(v); startCam(v).catch(() => box.append(h('p', { class: 'small' }, 'Kamera açılamadı'))); }
      else box.append(h('div', { class: 'empty' }, mine ? 'Senin fotoğrafın' : `${ctx.partnerName()} bekleniyor…`));
      box.append(h('b', {}, mine ? (ctx.mySide() === 'moon' ? '🌙 ' : '☀️ ') + ctx.myName() : (ctx.mySide() === 'moon' ? '☀️ ' : '🌙 ') + ctx.partnerName()));
      if (mine) box.append(h('div', { class: 'row' },
        mode === 'now' && !img ? h('button', { onclick: snap }, 'Çek') : null,
        h('button', { onclick: async () => { const f = await pickImage(); if (f) set(live.ref(`booth/slots/${uid}`), await compressImage(f, 480, 0.8)); } }, 'Yükle'),
        img ? h('button', { class: 'link', onclick: () => remove(live.ref(`booth/slots/${uid}`)) }, 'Yeniden') : null,
      ));
      return box;
    };
    b.append(h('div', { class: 'booth' }, slot(uid), h('div', { class: 'countdown' }), slot(pu || 'yok')));
    const both = slots[uid] && pu && slots[pu];
    b.append(h('div', { class: 'row wrap' },
      mode === 'now' ? h('button', { class: 'primary', onclick: async () => { await remove(live.ref('booth/slots')); set(live.ref('booth/shot'), { at: now() + 3500, by: uid }); } }, 'Birlikte çek (3-2-1)') : null,
      both ? h('button', { class: 'primary', onclick: saveStrip }, 'Şeridi albüme kaydet') : null,
      both ? h('button', { html: `${icon('download')} Galeriye kaydet`, onclick: async () => saveImage(await composeStrip(), `love-room-kabin-${Date.now()}.jpg`) }) : null,
      slots[uid] ? h('button', { class: 'link', onclick: () => saveImage(slots[uid], `love-room-ben-${Date.now()}.jpg`) }, 'Kendi kareni kaydet') : null,
      Object.keys(slots).length ? h('button', { class: 'link', onclick: () => remove(live.ref('booth/slots')) }, 'Temizle') : null,
    ));
    if (both) composeStrip().then((url) => b.querySelector('.strip-prev')?.setAttribute('src', url));
    if (both) b.append(h('img', { class: 'strip-prev', alt: '' }));
  }

  async function composeStrip() {
    const slots = booth.slots || {};
    const pu = ctx.partnerUid();
    const [a, bb] = await Promise.all([loadImg(slots[uid]), loadImg(slots[pu])]);
    // Güneş hep solda, ay sağda: iki tarafta da aynı şerit çıksın
    const sunFirst = ctx.mySide() !== 'moon';
    const left = sunFirst ? a : bb, right = sunFirst ? bb : a;
    const lName = sunFirst ? ctx.myName() : ctx.partnerName(), rName = sunFirst ? ctx.partnerName() : ctx.myName();
    const c = document.createElement('canvas');
    c.width = 760; c.height = 520;
    const g = c.getContext('2d');
    g.fillStyle = '#fff6e6'; g.fillRect(0, 0, 760, 520);
    g.fillStyle = '#ffd27a'; for (let x = 0; x < 760; x += 24) { g.fillRect(x, 0, 12, 10); g.fillRect(x + 12, 510, 12, 10); }
    const mode = booth.mode || 'now';
    const filt = mode === 'kid' ? 'sepia(0.55) contrast(1.05)' : 'none';
    const put = (img, x, rot) => {
      g.save(); g.translate(x + 165, 250); g.rotate(rot);
      g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 12; g.fillRect(-165, -175, 330, 370); g.shadowBlur = 0;
      g.filter = filt;
      const s = Math.max(310 / img.width, 310 / img.height), sw = 310 / s, sh = 310 / s;
      g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, -155, -165, 310, 310);
      g.restore();
    };
    put(left, 40, -0.035); put(right, 390, 0.035);
    g.fillStyle = '#3a2418'; g.textAlign = 'center';
    g.font = '600 30px "Pixelify Sans", monospace';
    g.fillText(`☀️ ${lName}`, 205, 470); g.fillText(`🌙 ${rName}`, 555, 470);
    g.font = '700 26px "Pixelify Sans", monospace'; g.fillStyle = '#ff4f7b';
    g.fillText(mode === 'kid' ? 'Biz küçükken' : mode === 'then' ? 'Aynı anı, iki kalp' : fmtDate(now()), 380, 46);
    g.font = '18px "Pixelify Sans", monospace'; g.fillStyle = '#b8ad8c';
    g.fillText('Love Room', 380, 506);
    return c.toDataURL('image/jpeg', 0.85);
  }
  async function saveStrip() {
    const img = await composeStrip();
    const mode = booth.mode || 'now';
    await addToAlbum(img, mode === 'kid' ? 'Biz küçükken' : mode === 'then' ? 'Aynı anı' : 'Kabin · ' + fmtDate(now()));
    toast('Şerit albüme kaydedildi 📸');
    ctx.onAward?.();
  }

  function openBooth() {
    boothBody = openSheet({ title: 'Fotoğraf kabini', iconName: 'booth', wide: true, onClose: () => { boothBody = null; stopCam(); } });
    renderBooth();
  }

  return { openFrame, openAlbum, openBooth, addToAlbum };
}
